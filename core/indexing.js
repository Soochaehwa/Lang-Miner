import fs from "fs";
import path from "path";
import log from "../utils/logger.js";
import config from "../config.js";

const __dirname = path.resolve();
const fsPromises = fs.promises;
const projectDir = config.PROJECT_DIR;

/**
 * 모드 인덱스를 업데이트 하는 함수
 * @param {object} index 인덱스 객체
 * @param {string} fileName 저장할 json 파일 이름
 */
export function updateModIndex(index, fileName) {
  log.info(`${fileName} 인덱스 업데이트`);

  const indexJson = JSON.stringify(index, null, 2);
  const indexJsonPath = path.join(
    `${__dirname}/${projectDir}`,
    `${fileName}.json`
  );
  fs.writeFile(indexJsonPath, indexJson, (err) => {
    if (err) {
      log.error(`${fileName}.json 저장 중 오류 발생: ${err}`);
    }
  });
}

/**
 * 인덱스 파일을 찾아서 읽어오는 함수
 * @returns 파일이 있으면 모드 인덱스 객체 반환 없으면 false 반환
 */
export async function getIndex(fileName) {
  try {
    await fsPromises.access(
      `./${projectDir}/${fileName}.json`,
      fs.constants.F_OK
    );
    const indexJson = fs.readFileSync(
      `./${projectDir}/${fileName}.json`,
      "utf8"
    );
    const index = JSON.parse(indexJson);
    return index;
  } catch {
    return false;
  }
}
