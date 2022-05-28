import log from "./utils/logger.js";
import * as utils from "./utils/utils.js";
import * as http from "./core/http.js";
import * as indexing from "./core/indexing.js";
import compareFileId from "./core/compare.js.js";
import extract from "./core/extract.js.js";
import chalk from "chalk";
import merge from "lodash.merge";

async function main(modLoader = "fabric", modVersion = "1.18", target) {
  const regex =
    /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?.json/;

  let projectIds = [];

  if (regex.test(target)) {
    projectIds = await http.getManifest(target);
  } else if (!isNaN(target)) {
    projectIds = [target];
  } else {
    return log.error(`잘못된 타겟 인수입니다.`);
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
      // const projectId = info[slug].id;
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
      const modExtract = extract(downloadedMod, modLoader, modVersion);
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

/*
TODO:
- 패츌리 모드 언어 추출
*/
