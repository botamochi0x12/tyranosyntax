import * as vscode from "vscode";
import { InformationWorkSpace } from "../InformationWorkSpace";
import * as fs from "fs";
import { Parser } from "../Parser";

type LabelsByName = {
  [tag: string]: {
    name: string;
    pm: {
      label_name: string;
      line: number;
    };
  };
};

type TagUse = {
  name: string;
  pm: {
    storage?: string;
    target?: string;
    file?: string;
  };
};

type TagsByName = {
  [tag: string]: {
    [param: string]: {
      type: string[];
      path: string;
    };
  };
};

export class TyranoJumpProvider {
  constructor() {}
  /**
   * alt(option) + J でシナリオジャンプした時の挙動
   */
  public async toDestination() {
    const infoWs = InformationWorkSpace.getInstance();
    const parser = Parser.getInstance();
    const jumpTagObject: { [tag: string]: string } = {};
    const document = vscode.window.activeTextEditor?.document;
    const position = vscode.window.activeTextEditor?.selection.active;
    if (
      document === undefined ||
      position === undefined ||
      jumpTagObject === undefined
    ) {
      return;
    }
    const projectPath = await infoWs.getProjectPathByFilePath(
      document.uri.fsPath,
    );
    const parsedData: TagUse[] = parser.parseText(
      document.lineAt(position.line).text,
    );

    // TyranoScript syntax.tag.parameterから、{"tagName":"Path"}の形のObjectを作成
    const tags: Object = await vscode.workspace
      .getConfiguration()
      .get("TyranoScript syntax.tag.parameter")!;
    const enableJumpTags = [
      "scenario",
      "script",
      "html",
      "css",
      "text",
      "button",
      "glink",
    ]; //TODO:ジャンプ系タグとしてどこかで定義すべき？
    for (let tagName in tags) {
      for (let paramName in tags[tagName]) {
        for (let type of tags[tagName][paramName].type) {
          if (enableJumpTags.includes(type)) {
            jumpTagObject[tagName] = tags[tagName][paramName].path;
          }
        }
      }
    }

    //F12押した付近のタグのデータを取得
    const tagIndex = parser.getIndex(parsedData, position.character);

    //カーソル位置のタグ名取得
    const tagName = parsedData[tagIndex]["name"];

    //TODO:loadcssタグ専用にfileを見るんじゃなくて、参照ラベル名（storageとかfileとか）をpackage.jsonで指定できるようにする。TyranoScript syntax.tag.parameterのような感じのobjectにすればいけるはず
    //リファクタリングに時間がかかりそうなことや、バグの懸念、今後も設計が変わるおそれがあるので今はこのままで
    const jumpStorage =
      parsedData[tagIndex]["pm"]?.["storage"] ??
      parsedData[tagIndex]["pm"]?.["file"] ??
      document.fileName.substring(
        document.fileName.lastIndexOf(infoWs.pathDelimiter) + 1,
      );

    const jumpTarget = parsedData[tagIndex]["pm"]?.["target"]?.replace("*", ""); //ラベルから `*` を除去しておく

    //カーソルの位置のタグがジャンプ系タグなら
    if (Object.keys(jumpTagObject).includes(tagName)) {
      //変数を使っている場合はジャンプさせない
      const variableStr = /&f\.|&sf\.|&tf\.|&mp\|/;
      if (
        !fs.existsSync(
          vscode.Uri.file(
            `${projectPath}${infoWs.pathDelimiter}${jumpTagObject[tagName]}${infoWs.pathDelimiter}${jumpStorage}`,
          ).fsPath,
        )
      ) {
        vscode.window.showWarningMessage(
          `${parsedData[tagIndex]["pm"]["storage"]}は存在しないファイルです。`,
        );
        return;
      }

      const jumpDefinitionFile = await vscode.workspace.openTextDocument(
        vscode.Uri.file(
          `${projectPath}${infoWs.pathDelimiter}${jumpTagObject[tagName]}${infoWs.pathDelimiter}${jumpStorage}`,
        ),
      );
      //ラベル未指定ならファイル頭にジャンプ
      if (jumpTarget == undefined) {
        const activeTextEditor = await vscode.window.showTextDocument(
          jumpDefinitionFile,
          { preview: true },
        );
        activeTextEditor.selection = new vscode.Selection(
          new vscode.Position(0, 0),
          new vscode.Position(0, 0),
        );
        activeTextEditor.revealRange(
          new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0),
          ),
        );
        return;
      }

      //変数ならジャンプさせない
      if (
        jumpStorage.search(variableStr) !== -1 ||
        jumpTarget.search(variableStr) !== -1
      ) {
        vscode.window.showInformationMessage(
          "storageやtargetパラメータに変数を使用しているためジャンプできません。",
        );
        return;
      }

      const jumpDefinitionArray_s: LabelsByName = parser.parseText(
        jumpDefinitionFile.getText(),
      );

      //ラベル探索して見つかったらその位置でジャンプしてreturn
      for (const jumpDefinition of Object.values(jumpDefinitionArray_s)) {
        if (jumpDefinition["name"] === "label") {
          const { label_name: labelName, line = 0 } = jumpDefinition["pm"];
          if (labelName === jumpTarget) {
            const activeTextEditor = await vscode.window.showTextDocument(
              jumpDefinitionFile,
              { preview: true },
            );
            activeTextEditor.selection = new vscode.Selection(
              new vscode.Position(line, 0),
              new vscode.Position(line, 0),
            );
            activeTextEditor.revealRange(
              new vscode.Range(
                new vscode.Position(line, 0),
                new vscode.Position(line, 0),
              ),
              vscode.TextEditorRevealType.InCenter,
            );
            return;
          }
        }
      }
      //ラベル見つからなかった時の処理
      const activeTextEditor = await vscode.window.showTextDocument(
        jumpDefinitionFile,
        { preview: true },
      );
      activeTextEditor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, 0),
      );
      activeTextEditor.revealRange(
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      );
      vscode.window.showInformationMessage(
        "ラベルが見つからなかったためファイルの先頭へとジャンプしました。",
      );
    } else {
      vscode.window.showWarningMessage(
        "現在選択しているタグはTyranoScript syntax.jump.tagに登録されているタグではありません。\nsetting.jsonをご確認ください。",
      );
    }
  }
}
