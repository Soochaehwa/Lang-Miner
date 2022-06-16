import log from "../utils/logger.js";
import chalk from "chalk";

/**
 * 입력받은 모드를 인덱스랑 비교하여 최신버전인지 확인하는 함수
 * @param {object} modIndex 모드 인덱스 객체
 * @param {string} slug 모드 슬러그
 * @param {string} modLoader 모드 로더
 * @param {string} modVersion 모드 버전
 * @param {string} fileId 모드 파일 ID
 * @returns 최신 버전이면 true 반환
 */
export default function compareFileId(
  modIndex,
  slug,
  modLoader,
  modVersion,
  fileId
) {
  if (modIndex[slug] && modIndex[slug][modLoader]) {
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
    return false;
  }
}
