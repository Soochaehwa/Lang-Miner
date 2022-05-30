import log from "./utils/logger.js";
import * as utils from "./utils/utils.js";
import * as http from "./core/http.js";
import * as indexing from "./core/indexing.js";
import * as extract from "./core/extract.js";
import compareFileId from "./core/compare.js";
import chalk from "chalk";
import merge from "lodash.merge";

async function main(modLoader, modVersion, projectId) {
  if (isNaN(projectId)) {
    return log.error(`올바르지 않은 프로젝트ID: ${projectId}`);
  }

  let projectIds = [];

  if (projectId === "0000") {
    log.info("인덱싱된 모든 모드를 업데이트합니다.");
    const modIndex = await indexing.getIndex("ModIndex");
    const modIndexKeys = Object.values(modIndex);
    projectIds = modIndexKeys.map((modIndexKey) => modIndexKey.id);
  } else {
    const projectType = await http.checkProjectType(projectId);

    if (projectType === "modpack") {
      log.info("프로젝트의 형식은 모드팩입니다.");

      const ModPackDownloadUrl = await http.getModPackDownloadUrl(projectId);
      const downloadedModPack = await http.download(ModPackDownloadUrl);
      projectIds = extract.manifest(downloadedModPack);
    } else if (projectType === "mod") {
      log.info("프로젝트의 형식은 모드입니다.");

      projectIds = [projectId];
    } else {
      return log.error(`추출할 수 없는 프로젝트 형식: ${projectType}`);
    }
  }

  log.info(`모드 ${projectIds.length}개 추출을 시작합니다.`);

  let index = {};
  let modIndex = await indexing.getIndex("ModIndex");
  modIndex ? null : (modIndex = {});
  let noLangIndex = await indexing.getIndex("NoLangModIndex");
  noLangIndex ? null : (noLangIndex = []);

  await Promise.all(
    projectIds.map(async (projectId) => {
      const info = await http.getModInfo(modLoader, projectId, modVersion);

      if (!info) {
        return;
      }

      const slug = Object.keys(info)[0];
      const fileId = Object.values(info[slug][modLoader]);

      if (noLangIndex.includes(slug)) {
        return log.info(
          `${chalk.hex("#FFEF82")(slug)} 언어 파일이 없는 모드입니다.`
        );
      }

      if (!utils.isEmpty(modIndex)) {
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

      const downloadUrl = await http.getDownloadUrl(projectId, fileId);
      const downloadedMod = await http.download(downloadUrl);
      const modExtract = extract.lang(downloadedMod, modLoader, modVersion);
      if (modExtract) {
        index = { ...index, ...info };
      } else {
        noLangIndex = [...noLangIndex, slug];
        log.info(`${chalk.hex("#FFEF82")(slug)} 언어 파일이 없는 모드입니다.`);
      }
    })
  );

  !utils.isEmpty(noLangIndex)
    ? indexing.updateModIndex(noLangIndex, "NoLangModIndex")
    : null;

  modIndex = merge(modIndex, index);
  !utils.isEmpty(index) ? indexing.updateModIndex(modIndex, "ModIndex") : null;
}

((arg) => {
  if (arg.length === 0) {
    return log.error(`인수가 없습니다.`);
  }
  main(arg[0], arg[1], arg[2]);
})(process.argv.slice(2));

/*
TODO:
- 패츌리 모드 언어 추출
*/
