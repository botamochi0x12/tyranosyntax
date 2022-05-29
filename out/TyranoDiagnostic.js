"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TyranoDiagnostic = void 0;
const vscode = require("vscode");
const fs = require("fs");
const InformationWorkSpace_1 = require("./InformationWorkSpace");
const InformationProjectData_1 = require("./InformationProjectData");
class TyranoDiagnostic {
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('tyranoDiagnostic');
        //ティラノスクリプトに関する情報
        this.infoPd = InformationProjectData_1.InformationProjectData.getInstance();
        //ファイルパス取得用
        this.infoWs = InformationWorkSpace_1.InformationWorkSpace.getInstance();
        //パーサー
        this.loadModule = require('./lib/module-loader.js').loadModule;
        this.parser = this.loadModule(__dirname + '/lib/tyrano_parser.js');
        this.JUMP_TAG = ["jump", "call", "link", "button", "glink", "clickable"];
        this.tyranoDefaultTag = this.infoPd.getDefaultTag();
    }
    ;
    async createDiagnostics() {
        let variables = new Map(); //プロジェクトで定義された変数を格納<variableName,value>
        const absoluteScenarioFiles = this.infoWs.getProjectFiles(this.infoWs.getProjectRootPath() + this.infoWs.DATA_DIRECTORY, [".ks"], true);
        let diagnosticArray = []; //診断結果を一時的に保存する配列
        //シナリオからマクロ定義を読み込む  jsで定義されたタグ以外は問題なさそう
        // let tyranoTag = await this.loadDefinedMacroByScenarios(this.tyranoDefaultTag.slice(), absoluteScenarioFiles);
        //シナリオ名とラベルを読み込む <scenarioName, labels>
        // let scenarioAndLabels = await this.loadDefinedScenarioAndLabels(scenarioFiles);
        //未定義のマクロを使用しているか検出
        // await this.detectionNotDefineMacro(tyranoTag, absoluteScenarioFiles, diagnosticArray);
        //存在しないシナリオファイル、未定義のラベルを検出
        await this.detectionNotExistScenarioAndLabels(absoluteScenarioFiles, diagnosticArray);
        // await this.__detectionNotExistScenarioAndLabels(scenarioAndLabels, scenarioFiles, diagnosticArray);
        //診断結果をセット
        this.diagnosticCollection.set(diagnosticArray);
    }
    /**
     * シナリオで定義されているタグを返却します。
     * @param 現在定義されているティラノスクリプトのタグのリスト
     * @return ティラノ公式タグ+読み込んだ定義済みマクロの名前の配列
     */
    async loadDefinedMacroByScenarios(tyranoTag, scenarioFiles) {
        for (const scenario of scenarioFiles) {
            // const scenarioFileAbsolutePath = this.infoWs.getProjectRootPath() + this.infoWs.DATA_DIRECTORY + "/" + scenario;//dataファイルにあるシナリオの絶対パス取得
            const scenarioDocument = await vscode.workspace.openTextDocument(scenario); //引数のパスのシナリオ全文取得
            const parsedData = this.parser.tyranoParser.parseScenario((await scenarioDocument).getText()); //構文解析
            const array_s = parsedData["array_s"];
            for (let data in array_s) {
                //タグがマクロなら
                if (array_s[data]["name"] === "macro") {
                    //マクロの名前をリストかなんかに保存しておく。
                    tyranoTag.push(await array_s[data]["pm"]["name"]);
                }
            }
        }
        return tyranoTag;
    }
    /**
     * 未定義のマクロを使用しているか検出します。
     * @param tyranoTag 現在プロジェクトに定義しているティラノスクリプトのタグ
     */
    async detectionNotDefineMacro(tyranoTag, scenarioFiles, diagnosticArray) {
        for (const scenario of scenarioFiles) {
            // const scenarioFileAbsolutePath = this.infoWs.getProjectRootPath() + this.infoWs.DATA_DIRECTORY + "/" + scenario; //dataファイルにあるシナリオの絶対パス取得
            const scenarioDocument = await vscode.workspace.openTextDocument(scenario); //引数のパスのシナリオ全文取得
            const parsedData = this.parser.tyranoParser.parseScenario(scenarioDocument.getText()); //構文解析
            const array_s = parsedData["array_s"];
            let diagnostics = [];
            for (let data in array_s) {
                //タグが定義されていない場合
                if (!tyranoTag.includes(array_s[data]["name"])) {
                    let tagFirstIndex = scenarioDocument.lineAt(array_s[data]["line"]).text.indexOf(array_s[data]["name"]); // 該当行からタグの定義場所(開始位置)探す
                    let tagLastIndex = scenarioDocument.lineAt(array_s[data]["line"]).text.lastIndexOf(array_s[data]["name"]); // 該当行からタグの定義場所(終了位置)探す
                    let range = new vscode.Range(array_s[data]["line"], tagFirstIndex, array_s[data]["line"], tagLastIndex);
                    let diag = new vscode.Diagnostic(range, "タグ" + array_s[data]["name"] + "は未定義です。", vscode.DiagnosticSeverity.Error);
                    diagnostics.push(diag);
                }
            }
            diagnosticArray.push([scenarioDocument.uri, diagnostics]);
        }
    }
    async detectionNotExistScenarioAndLabels(scenarioFiles, diagnosticArray) {
        for (const scenario of scenarioFiles) {
            // ラベル関係は、以下のアルゴリズムのが良さそう？
            /**
             * 1.data直下の全シナリオを順番に読み込む
             * 2.シナリオでジャンプ系タグが来るたびに、storageがあるならstorageがプロジェクト内に存在するか確かめる。（storageに相対パスを指定する場合、カレントディレクトリはscenarioフォルダ）
             * 2.5.storageがなければ現在開いているファイルをstorageとする
             * 3.storageで指定したファイルを構文解析にかけて目的のラベルがあるかを調べる。ないならdiagに入れる。continueする。
             * 4.storageがOKならtargetの指定に入る
             * 5.storageで指定されたファイルを読み込んで(シナリオフォルダをカレントディレクトリとして、storageの値をプラスする)、targetで指定したラベルがあればループ抜けてOK.
             * 6.ラベル無ければdiagに入れる。
             * 別途パラメータに変数指定した場合の関数も作る？
             * 再帰関数にすればfor文の数少なくなるかも？
             */
            /**
             * パースデータ取得関数はどこかでまとめると良いかも。array_sを戻り値とする。引数で指定したシナリオのパースデータ取得とかそんな感じで。
             *
             */
            //scenarioにはothers/plugin/other_macro_define_folder/other_macro_define.ks'が入っている。
            const scenarioDocument = await vscode.workspace.openTextDocument(scenario); //引数のパスのシナリオ全文取得
            const parsedData = this.parser.tyranoParser.parseScenario(scenarioDocument.getText()); //構文解析
            const array_s = parsedData["array_s"];
            let diagnostics = [];
            for (let data in array_s) {
                //storageに付いての処理(指定したファイルが有るかどうか)
                if (this.JUMP_TAG.includes(array_s[data]["name"])) {
                    if (array_s[data]["pm"]["storage"] !== undefined) {
                        let tagFirstIndex = scenarioDocument.lineAt(array_s[data]["line"]).text.indexOf(array_s[data]["pm"]["storage"]); // 該当行からタグの定義場所(開始位置)探す
                        let tagLastIndex = scenarioDocument.lineAt(array_s[data]["line"]).text.indexOf(array_s[data]["pm"]["storage"]) + array_s[data]["pm"]["storage"].length; // 該当行からタグの定義場所(終了位置)探す
                        let range = new vscode.Range(array_s[data]["line"], tagFirstIndex, array_s[data]["line"], tagLastIndex);
                        if (this.isValueIsIncludeVariable(array_s[data]["pm"]["storage"])) {
                            if (!this.isExistAmpersandAtBeginning(array_s[data]["pm"]["storage"])) {
                                let diag = new vscode.Diagnostic(range, "パラメータに変数を使う場合は先頭に'&'が必要です。", vscode.DiagnosticSeverity.Error);
                                diagnostics.push(diag);
                                continue;
                            }
                        }
                        else {
                            if (!array_s[data]["pm"]["storage"].endsWith(".ks")) {
                                let diag = new vscode.Diagnostic(range, "storageパラメータは末尾が'.ks'である必要があります。", vscode.DiagnosticSeverity.Error);
                                diagnostics.push(diag);
                                continue;
                            }
                            if (!fs.existsSync(this.infoWs.getProjectRootPath() + this.infoWs.DATA_DIRECTORY + this.infoWs.DATA_SCENARIO + "/" + array_s[data]["pm"]["storage"])) {
                                let diag = new vscode.Diagnostic(range, array_s[data]["pm"]["storage"] + "は存在しないファイルです。", vscode.DiagnosticSeverity.Error);
                                diagnostics.push(diag);
                                continue;
                            }
                        }
                    }
                    //storageが指定されてないなら現在開いているファイルとする
                    //scenarioがscenarioフォルダにない時にバグる
                    if (array_s[data]["pm"]["storage"] === undefined) {
                        let tmp = scenario.replace(this.infoWs.getProjectRootPath() + this.infoWs.DATA_DIRECTORY + this.infoWs.DATA_SCENARIO + "/", '');
                        array_s[data]["pm"]["storage"] = scenario.replace(this.infoWs.getProjectRootPath() + this.infoWs.DATA_DIRECTORY + this.infoWs.DATA_SCENARIO + "/", ''); //scenarioフォルダをカレントディレクトリとした、シナリオフォルダへの相対パスとする。
                        console.log(array_s[data]["pm"]["storage"]);
                    }
                    // targetについての処理
                    if (array_s[data]["pm"]["target"] !== undefined) {
                        let tagFirstIndex = scenarioDocument.lineAt(array_s[data]["line"]).text.indexOf(array_s[data]["pm"]["target"]); // 該当行からタグの定義場所(開始位置)探す
                        let tagLastIndex = scenarioDocument.lineAt(array_s[data]["line"]).text.indexOf(array_s[data]["pm"]["target"]) + array_s[data]["pm"]["target"].length; // 該当行からタグの定義場所(終了位置)探す
                        let range = new vscode.Range(array_s[data]["line"], tagFirstIndex, array_s[data]["line"], tagLastIndex);
                        if (this.isValueIsIncludeVariable(array_s[data]["pm"]["target"])) {
                            if (!this.isExistAmpersandAtBeginning(array_s[data]["pm"]["target"])) {
                                let diag = new vscode.Diagnostic(range, "パラメータに変数を使う場合は先頭に'&'が必要です。", vscode.DiagnosticSeverity.Error);
                                diagnostics.push(diag);
                                continue;
                            }
                        }
                        else if (!this.isValueIsIncludeVariable(array_s[data]["pm"]["storage"])) { //targetがundefinedじゃない&&storageが変数でもない
                            //targetから*を外して表記ゆれ防ぐ
                            array_s[data]["pm"]["target"] = array_s[data]["pm"]["target"].replace("*", "");
                            let isLabelExsit = false;
                            //ファイル探索して、該当のラベルがあればisLabelExsitをtrueにして操作打ち切る
                            //							const storageScenarioDocument = await vscode.workspace.openTextDocument(this.infoWs.getProjectRootPath() + this.infoWs.DATA_DIRECTORY + this.infoWs.DATA_SCENARIO + "/" + array_s[data]["pm"]["storage"]);//引数のパスのシナリオ全文取得
                            //ファイルオープンする時にproj/data/scenario + "/" + storage
                            const storageScenarioDocument = await vscode.workspace.openTextDocument(this.infoWs.getProjectRootPath() + this.infoWs.DATA_DIRECTORY + this.infoWs.DATA_SCENARIO + "/" + array_s[data]["pm"]["storage"]); //引数のパスのシナリオ全文取得
                            const storageParsedData = this.parser.tyranoParser.parseScenario(storageScenarioDocument.getText()); //構文解析
                            const storageArray_s = storageParsedData["array_s"];
                            for (let storageData in storageArray_s) {
                                if ((storageArray_s[storageData]["pm"]["label_name"] === array_s[data]["pm"]["target"])) {
                                    isLabelExsit = true;
                                    break;
                                }
                            }
                            if (!isLabelExsit) {
                                let diag = new vscode.Diagnostic(range, array_s[data]["pm"]["target"] + "は存在しないラベルです。", vscode.DiagnosticSeverity.Error);
                                diagnostics.push(diag);
                                continue;
                            }
                        }
                    }
                }
            }
            diagnosticArray.push([scenarioDocument.uri, diagnostics]);
        }
    }
    /**
     * 引数に入れた変数混じりの文字列に&記号があるかを判断します。
     * @returns trueなら&がある、 falseなら&がない
     */
    isExistAmpersandAtBeginning(value) {
        //いずれともマッチしないならアンパサンドがない
        if (value.match(/&f\.[a-zA-Z_]\w*/) === null &&
            value.match(/&sf\.[a-zA-Z_]\w*/) === null &&
            value.match(/&tf\.[a-zA-Z_]\w*/) === null) {
            return false;
        }
        return true;
    }
    /**
     * 引数に入れた値が変数を含むかどうかを判断します。
     * @returns trueなら値は変数 falseなら値は変数でない
     */
    isValueIsIncludeVariable(value) {
        //いずれの変数ともマッチしないならvalueに変数は含まれていない
        if (value.match(/f\.[a-zA-Z_]\w*/) === null &&
            value.match(/sf\.[a-zA-Z_]\w*/) === null &&
            value.match(/tf\.[a-zA-Z_]\w*/) === null) {
            return false;
        }
        return true;
    }
    /**
     * 読み込んだスクリプトの現在位置がラベルで定義済みかを判断します。
     * @param scenarioFileLabel  ジャンプ系タグで指定されたtargetの値
     * @param loadingScriptLabel 現在読み込んでいるシナリオの現在のラベル
     * @returns
     */
    async checkLoadingScriptIsDefinedLabel(scenarioFileLabel, loadingScriptLabel) {
        //ターゲットが未指定、もしくはターゲットとラベルが一致する
        if (scenarioFileLabel === undefined || scenarioFileLabel === "" || loadingScriptLabel === scenarioFileLabel) {
            return true;
        }
        return false;
    }
}
exports.TyranoDiagnostic = TyranoDiagnostic;
//# sourceMappingURL=TyranoDiagnostic.js.map