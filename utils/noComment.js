import stripJsonComments from "strip-json-comments";
import fs from "fs";
import log from "./logger.js";

export default function noComment(dir) {
  try {
    const langs = fs.readdirSync(dir);
    langs.map((lang) => {
      const json = fs.readFileSync(`${dir}/${lang}`, "utf8");
      const jsonWithoutComments = JSON.parse(stripJsonComments(json));
      fs.writeFileSync(
        `${dir}/${lang}`,
        JSON.stringify(jsonWithoutComments, null, 2)
      );
    });
  } catch (error) {
    log.error("JSON 파일 분석 오류");
  }
}
