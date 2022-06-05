import AdmZip from "adm-zip";
import path from "path";
import chalk from "chalk";
import log from "../utils/logger.js";
import noComment from "../utils/noComment.js";
import config from "../config.js";
import fs from "fs";

const __dirname = path.resolve();
const projectDir = config.PROJECT_DIR;

/**
 * 다운받은 모드의 lang파일을 추출하는 함수
 * @param {arraybuffer} buffer 추출 할 파일의 arraybuffer
 * @param {string} modLoader 모드로더 종류 ex:forge, fabric
 * @param {string} modVersion 모드 버전 (마이너 버전까지만 입력)
 * @returns 성공여부 반환
 */
export function lang(buffer, modLoader, modVersion, isFirst) {
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

      if (isFirst) {
        const hasKor = zip.readAsText(`assets/${modId}/lang/ko_kr.json`);

        if (hasKor) {
          log.info(`${modId} 한국어 파일 감지됨`);
          zip.extractEntryTo(
            `assets/${modId}/lang/ko_kr.json`,
            `${assetsPath}`,
            true,
            true
          );
        } else {
          log.info(`${modId} 한국어 파일 생성`);
          const emptyKor = `{}`;
          const emptyKorPath = path.join(
            assetsPath,
            "assets",
            modId,
            "lang",
            "ko_kr.json"
          );
          fs.writeFileSync(emptyKorPath, emptyKor);
        }
      }

      noComment(path.join(assetsPath, "assets", modId, "lang"));
      log.info(`${chalk.hex("#FFA500")(modId)} 추출 완료`);
      return true;
    }
    return false;
  } catch (error) {
    log.error(`추출 중 오류 발생: ${error}`);
  }
}

/**
 * 모드팩 파일의 manifest.json의 project id를 배열로 반환하는 함수
 * @param {arraybuffer} buffer 모드팩 파일의 arraybuffer
 * @returns projectIds
 */
export function manifest(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const manifest = JSON.parse(zip.readAsText("manifest.json"));
    const files = manifest.files;

    const projectIds = files.map((files) => files.projectID);

    return projectIds;
  } catch (error) {
    log.error(`manifest 추출 중 오류 발생: ${error}`);
  }
}
