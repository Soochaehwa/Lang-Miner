import stripJsonComments from "strip-json-comments";
import fs from "fs";

export default function noComment(dir) {
  const langs = fs.readdirSync(dir);
  langs.map((lang) => {
    const json = fs.readFileSync(`${dir}/${lang}`, "utf8");
    const jsonWithoutComments = JSON.parse(stripJsonComments(json));
    fs.writeFileSync(
      `${dir}/${lang}`,
      JSON.stringify(jsonWithoutComments, null, 2)
    );
  });
}
