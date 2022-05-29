import Axios from "axios";
import axiosRetry from "axios-retry";
import log from "../utils/logger.js";
import config from "../config.js";

const API = config.API;
const headers = {
  "x-api-key": config.API_KEY,
};

axiosRetry(Axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000;
  },
  retryCondition: (error) => {
    return error.response.status === 504;
  },
});

/**
 * URL을 받아 파일을 다운로드 하는 함수
 * @param {string} url 다운로드 할 파일의 URL
 * @returns 다운로드 한 파일의 arraybuffer 반환
 */
export async function download(url) {
  try {
    const response = await Axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
    });

    return response.data;
  } catch (error) {
    log.error(`다운로드 중 오류 발생: ${error}`);
  }
}

/**
 * 프로젝트 ID와 파일 ID를 받아 다운로드 URL을 반환하는 함수
 * @param {number} projectId 프로젝트 Id
 * @param {string} fileId 파일 Id
 * @returns 모드를 다운로드 할 수 있는 URL 반환
 */
export async function getDownloadUrl(projectId, fileId) {
  try {
    const response = await Axios.get(
      `${API}/mods/${projectId}/files/${fileId}/download-url`,
      {
        headers,
      }
    );
    return response.data.data;
  } catch (error) {
    log.error(`다운로드 URL을 찾는 중 오류 발생: ${error}`);
  }
}

/**
 * 프로젝트 ID를 받아 모드의 정보를 반환하는 함수
 * @param {string} modLoader 모드로더 종류 ex:forge, fabric
 * @param {number} projectId 프로젝트Id
 * @param {string} modVersion 모드 버전 (마이너 버전까지만 입력)
 * @returns 모드 정보 반환
 */
export async function getModInfo(modLoader, projectId, modVersion) {
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

    const response = await Axios.get(`${API}/mods/${projectId}`, {
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
        return info;
      }
    }
  } catch (error) {
    log.error(`모드 정보를 찾는 중 오류 발생: ${error}`);
  }
}

/**
 * 프로젝트가 모드인지 모드팩인지 확인하는 함수
 * @param {number} projectId 프로젝트 ID
 * @returns {string} 프로젝트 타입 반환
 */
export async function checkProjectType(projectId) {
  try {
    const response = await Axios.get(`${API}/mods/${projectId}`, {
      headers,
    });
    const projectType = response.data.data.classId;

    if (projectType === 4471) {
      return "modpack";
    } else if (projectType === 6) {
      return "mod";
    } else {
      return "unknown";
    }
  } catch (error) {
    log.error(`존재하지 않는 프로젝트: ${error}`);
  }
}

/**
 * 최신버전의 모드팩 다운로드URL을 반환하는 함수
 * @param {number} projectId 프로젝트 ID
 * @returns 모드팩 다운로드URL 반환
 */
export async function getModPackDownloadUrl(projectId) {
  try {
    const response = await Axios.get(`${API}/mods/${projectId}/files`, {
      headers,
    });
    return response.data.data[0].downloadUrl;
  } catch (error) {
    log.error(`다운로드 중 오류 발생: ${error}`);
  }
}
