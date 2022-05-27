import fs from "fs";
import AdmZip from "adm-zip";
import path from "path";
import Axios from "axios";
import log from "./utils/logger.js";
import chalk from "chalk";
import merge from "lodash.merge";

const __dirname = path.resolve();
const fsPromises = fs.promises;
const API = "https://api.curse.tools/v1/cf";

/**
 * URL을 받아 파일을 다운로드 하는 함수
 * @param {string} url 다운로드 할 파일의 URL
 * @returns 다운로드 한 파일의 arraybuffer 반환
 */
async function download(url) {
  try {
    const response = await Axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
    });

    return new Promise((resolve) => {
      resolve(response.data);
    });
  } catch (error) {
    log.error(`다운로드 중 오류 발생: ${error}`);
  }
}

/**
 * 모드 ID와 파일 ID를 받아 다운로드 URL을 반환하는 함수
 * @param {string} modId 모드 Id
 * @param {string} fileId 파일 Id
 * @returns 모드를 다운로드 할 수 있는 URL 반환
 */
async function getDownloadUrl(modId, fileId) {
  try {
    const response = await Axios.get(
      `${API}/mods/${modId}/files/${fileId}/download-url`
    );
    return new Promise((resolve) => {
      resolve(response.data.data);
    });
  } catch (error) {
    log.error(`다운로드 URL을 찾는 중 오류 발생: ${error}`);
  }
}

/**
 * 다운받은 모드의 lang파일을 추출하는 함수
 * @param {arraybuffer} buffer 추출 할 파일의 arraybuffer
 * @returns 성공여부 반환
 */
function extract(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const zipEntriesLength = zipEntries.length;

    let modId = "";

    for (let i = 0; i < zipEntriesLength; i++) {
      const zipEntry = zipEntries[i];
      const zipEntryName = zipEntry.entryName;
      const regex = /((assets\/)(.*)(\/lang))/gm;

      if (regex.test(zipEntryName)) {
        if (!zipEntryName.includes("minecraft")) {
          const zipEntryNameSplit = zipEntryName.split("/");
          modId = zipEntryNameSplit[1];
          break;
        }
      }
    }

    const assetsPath = path.join(__dirname, "test");

    if (modId) {
      zip.extractEntryTo(
        `assets/${modId}/lang/en_us.json`,
        `${assetsPath}`,
        true,
        true
      );
      log.info(`${chalk.hex("#FFA500")(modId)} 추출 완료`);
      return true;
    }
  } catch (error) {
    log.error(`추출 중 오류 발생: ${error}`);
  }
}

/**
 * 모드 ID를 받아 모드의 정보를 반환하는 함수
 * @param {string} modLoader 모드로더 종류 ex:forge, fabric
 * @param {string} modId 모드Id
 * @param {string} modVersion 모드 버전 (마이너 버전까지만 입력)
 * @returns 모드 정보 반환
 */
async function getModInfo(modLoader, modId, modVersion) {
  try {
    modLoader = modLoader.toLowerCase();
    if (modLoader === "fabric") {
      modLoader = 4;
    } else if (modLoader === "forge") {
      modLoader = 1;
    } else {
      return log.error(`잘못된 모드 로더 입니다.`);
    }

    const version = modVersion;

    const response = await Axios.get(`${API}/mods/${modId}`);
    const modInfo = response.data.data;

    const latestFiles = modInfo.latestFilesIndexes;

    const latestFilesLength = latestFiles.length;

    for (let i = 0; i < latestFilesLength; i++) {
      const latestFile = latestFiles[i];
      if (
        latestFile.gameVersion.includes(version) &&
        latestFile.modLoader === modLoader
      ) {
        const version = latestFile.gameVersion;
        const fileId = latestFile.fileId;
        const slug = modInfo.slug;
        const name = modInfo.name;
        const id = modInfo.id;

        if (modLoader === 4) {
          modLoader = "fabric";
        } else if (modLoader === 1) {
          modLoader = "forge";
        }

        const info = {
          [slug]: {
            name,
            id,

            [modLoader]: {
              [version]: fileId,
            },
          },
        };
        return new Promise((resolve) => {
          resolve(info);
        });
      }
    }
  } catch (error) {
    log.error(`모드 정보를 찾는 중 오류 발생: ${error}`);
  }
}

(async () => {
  const manifest = await fsPromises.readFile("./manifest.json", "utf8");

  const manifestJson = JSON.parse(manifest);
  const files = manifestJson.files;
  const modLoader = "forge";
  const modVersion = "1.18";

  let index = {};

  const Promises = files.map(async (file) => {
    const info = await getModInfo(modLoader, file.projectID, modVersion);

    if (!info) {
      return;
    }

    const slug = Object.keys(info)[0];

    const modId = info[slug].id;
    const fileId = Object.values(info[slug][modLoader]);

    const downloadUrl = await getDownloadUrl(modId, fileId);

    if (!downloadUrl.includes(".zip")) {
      const downloadedMod = await download(downloadUrl);
      const modExtract = extract(downloadedMod);

      if (modExtract) {
        index = { ...index, ...info };
      }
    }
  });

  await Promise.all(Promises);

  const modJson = await fsPromises.readFile("./ModIndex.json", "utf8");
  let modIndex = JSON.parse(modJson);

  modIndex = merge(modIndex, index);

  const indexJson = JSON.stringify(modIndex, null, 2);
  const indexJsonPath = path.join(__dirname, "ModIndex.json");
  fs.writeFile(indexJsonPath, indexJson, (err) => {
    if (err) {
      log.error(`index.json 저장 중 오류 발생: ${err}`);
    }
  });

  // files.forEach(async (file) => {
  //   const info = await getModInfo(modLoader, file.projectID, modVersion);
  //   const slug = Object.keys(info)[0];

  //   const modId = info[slug].id;
  //   const fileId = Object.values(info[slug][modLoader]);

  //   const downloadUrl = await getDownloadUrl(modId, fileId);

  //   if (!downloadUrl.includes(".zip")) {
  //     const downloadedMod = await download(downloadUrl);
  //     const modExtract = extract(downloadedMod);

  //     if (modExtract) {
  //       index = { ...index, ...info };
  //       console.log(index);
  //     }
  //   }

  //   // const downloadUrl = await getDownloadUrl(modInfo.Id, modInfo.[modLoader].[])

  //   // console.log(file.projectID);

  //   // console.log(modInfo);
  //   //const downloadUrl = await getDownloadUrl(file.projectID, file.fileID);

  //   //log.info(downloadUrl);

  //   // if (!downloadUrl.includes(".zip")) {
  //   //   const downloadedMod = await download(downloadUrl);

  //   //   extract(downloadedMod);
  //   // }
  // });
})();
