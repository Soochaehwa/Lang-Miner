import fs from "fs";
import AdmZip from "adm-zip";
import path from "path";
import Axios from "axios";
import log from "./utils/logger.js";
import { isEmpty } from "./utils/utils.js";
import chalk from "chalk";
import merge from "lodash.merge";
import config from "./config.js";

const __dirname = path.resolve();
const fsPromises = fs.promises;
const API = "https://api.curseforge.com/v1";
const projectDir = "Korean-Resource-Pack";
const headers = {
  "x-api-key": config.API_KEY,
};

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
      headers,
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
      `${API}/mods/${modId}/files/${fileId}/download-url`,
      {
        headers,
      }
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
 * @param {string} modLoader 모드로더 종류 ex:forge, fabric
 * @param {string} modVersion 모드 버전 (마이너 버전까지만 입력)
 * @returns 성공여부 반환
 */
function extract(buffer, modLoader, modVersion) {
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

    const assetsPath = path.join(
      __dirname,
      `${projectDir}/${modLoader}-${modVersion}`
    );

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
    return false;
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

    const response = await Axios.get(`${API}/mods/${modId}`, {
      headers,
    });
    const modInfo = response.data.data;

    const latestFiles = modInfo.latestFilesIndexes;

    const latestFilesLength = latestFiles.length;

    for (let i = 0; i < latestFilesLength; i++) {
      const latestFile = latestFiles[i];
      if (
        latestFile.gameVersion.startsWith(version) &&
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

/**
 * 인덱스 파일을 찾아서 읽어오는 함수
 * @returns 파일이 있으면 모드 인덱스 객체 반환 없으면 false 반환
 */
async function getIndex(fileName) {
  try {
    await fsPromises.access(`${fileName}.json`, fs.constants.F_OK);
    const indexJson = fs.readFileSync(`./${fileName}.json`, "utf8");
    const index = JSON.parse(indexJson);
    return index;
  } catch {
    return false;
  }
}

/**
 * 입력받은 모드를 인덱스랑 비교하여 최신버전인지 확인하는 함수
 * @param {object} modIndex 모드 인덱스 객체
 * @param {string} slug 모드 슬러그
 * @param {string} modLoader 모드 로더
 * @param {string} modVersion 모드 버전
 * @param {string} fileId 모드 파일 ID
 * @returns 최신 버전이면 true 반환
 */
function compareFileId(modIndex, slug, modLoader, modVersion, fileId) {
  if (modIndex[slug]) {
    const latestIndex = modIndex[slug][modLoader];
    const indexedVersions = Object.keys(latestIndex);
    const indexedVersionsLength = indexedVersions.length;

    for (let i = 0; i < indexedVersionsLength; i++) {
      const indexedVersion = indexedVersions[i];

      if (indexedVersion.startsWith(modVersion)) {
        const indexedLatestFileId = latestIndex[indexedVersion];

        if (parseInt(fileId) === indexedLatestFileId) {
          log.info(
            `${chalk.hex("#FF0075")(slug)} 모드의 언어 파일은 최신 버전입니다.`
          );
          return new Promise((resolve) => {
            resolve(true);
          });
        }
      }
    }
  }
}

/**
 * 모드 인덱스를 업데이트 하는 함수
 * @param {object} index 인덱스 객체
 * @param {string} fileName 저장할 json 파일 이름
 */
function updateModIndex(index, fileName) {
  log.info(`${fileName} 인덱스 업데이트`);

  const indexJson = JSON.stringify(index, null, 2);
  const indexJsonPath = path.join(__dirname, `${fileName}.json`);
  fs.writeFile(indexJsonPath, indexJson, (err) => {
    if (err) {
      log.error(`${fileName}.json 저장 중 오류 발생: ${err}`);
    }
  });
}

(async () => {
  const manifest = fs.readFileSync("./manifest.json", "utf8");

  const manifestJson = JSON.parse(manifest);
  const files = manifestJson.files;
  const modLoader = "fabric";
  const modVersion = "1.18";

  let index = {};

  let modIndex = await getIndex("ModIndex");
  modIndex ? null : (modIndex = {});
  let noLangIndex = await getIndex("NoLangModIndex");
  noLangIndex ? null : (noLangIndex = []);

  await Promise.all(
    files.map(async (file) => {
      const info = await getModInfo(modLoader, file.projectID, modVersion);

      if (!info) {
        return;
      }

      const slug = Object.keys(info)[0];
      const modId = info[slug].id;
      const fileId = Object.values(info[slug][modLoader]);

      if (noLangIndex.includes(slug)) {
        return log.info(
          `${chalk.hex("#FFEF82")(slug)} 언어 파일이 없는 모드입니다.`
        );
      }

      if (!isEmpty(modIndex)) {
        const isLatest = await compareFileId(
          modIndex,
          slug,
          modLoader,
          modVersion,
          fileId
        );
        if (isLatest) {
          return;
        }
      }

      const downloadUrl = await getDownloadUrl(modId, fileId);
      const downloadedMod = await download(downloadUrl);
      const modExtract = extract(downloadedMod, modLoader, modVersion);
      if (modExtract) {
        index = { ...index, ...info };
      } else {
        noLangIndex = [...noLangIndex, slug];
      }
    })
  );

  !isEmpty(noLangIndex) ? updateModIndex(noLangIndex, "NoLangModIndex") : null;

  modIndex = merge(modIndex, index);
  !isEmpty(index) ? updateModIndex(modIndex, "ModIndex") : null;
})();

/*
TODO:
- 모드 인덱스랑 비교해서 버전이 바뀐 모드만 다운로드
- manifest.json 파일을 주소로 받아서 분석
- 모드팩 말고 단일 모드도 프로젝트 ID만 적으면 추가되게 하기
- 패츌리 모드 언어 추출
- 함수 모듈로 나누기
*/
