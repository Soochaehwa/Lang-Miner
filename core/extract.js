import AdmZip from "adm-zip";
import path from "path";
import log from "../utils/logger.js";
import chalk from "chalk";

const __dirname = path.resolve();
const projectDir = "Korean-Resource-Pack";

/**
 * 다운받은 모드의 lang파일을 추출하는 함수
 * @param {arraybuffer} buffer 추출 할 파일의 arraybuffer
 * @param {string} modLoader 모드로더 종류 ex:forge, fabric
 * @param {string} modVersion 모드 버전 (마이너 버전까지만 입력)
 * @returns 성공여부 반환
 */
export default function extract(buffer, modLoader, modVersion) {
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
