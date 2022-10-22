"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TyranoDefinitionProvider = void 0;
const InformationWorkSpace_1 = require("../InformationWorkSpace");
class TyranoDefinitionProvider {
    constructor() {
        this.infoWs = InformationWorkSpace_1.InformationWorkSpace.getInstance();
    }
    /**
     * Provide the definition of the symbol at the given position and document.
     *
     * @param document The document in which the command was invoked.
     * @param position The position at which the command was invoked.
     * @param token A cancellation token.
     * @return A definition or a thenable that resolves to such. The lack of a result can be
     * signaled by returning `undefined` or `null`.
     */
    async provideDefinition(document, position, token) {
        var _a;
        const projectPath = await this.infoWs.getProjectPathByFilePath(document.uri.fsPath);
        let parsedData = this.infoWs.parser.tyranoParser.parseScenario(document.lineAt(position.line).text);
        const array_s = parsedData["array_s"];
        //F12押した付近のタグのデータを取得
        let tagNumber = "";
        for (let data in array_s) {
            console.log(data);
            //マクロの定義column > カーソル位置なら探索不要なのでbreak;
            if (array_s[data]["column"] > position.character) {
                break;
            }
            tagNumber = data;
        }
        //カーソル位置のマクロのMapデータ取得
        const retMacroData = (_a = this.infoWs.defineMacroMap.get(projectPath)) === null || _a === void 0 ? void 0 : _a.get(array_s[tagNumber]["name"]);
        return retMacroData === null || retMacroData === void 0 ? void 0 : retMacroData.location;
    }
}
exports.TyranoDefinitionProvider = TyranoDefinitionProvider;
//# sourceMappingURL=TyranoDefinitionProvider.js.map