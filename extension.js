//拡張機能のエントリポイント

const vscode = require('vscode');
const fs = require('fs');
const { match } = require('assert');
const { isRegExp } = require('util');
const { resolve } = require('path');

const TYRANO_MODE = { scheme: 'file', language: 'tyrano' };

let jsonTyranoSnipet = null;


class TagHoverProvider{
	constructor(){
		this.jsonTyranoSnipet = JSON.parse(fs.readFileSync(__dirname+"/snippet/tyrano.snippet.json","utf8"));
		this.regExp = /((\w+))\s*((\S*)=\"?(\w*)\"?)*()/;
	}

	createMarkdownText(textValue){
		if(!textValue) return null;
		let textCopy = textValue["description"].slice();//非同期通信では引数で受け取った配列を変更してはいけない
		let backQuoteStartIndex = textCopy.indexOf("[パラメータ]");
		textCopy.splice(backQuoteStartIndex, 0, "```tyrano");//マークダウンの作成
		textCopy.push("```");

//マークダウン崩れるのでここはインデント変えたらだめ
		let sentence = 
`
### ${textValue["prefix"]}

${textCopy.join('  \n')}
`
		let markdownText = new vscode.MarkdownString(sentence);

		return markdownText;
	}

	async provideHover(document, position, token){

		let wordRange = document.getWordRangeAtPosition(position, this.regExp);
		
		if (!wordRange) {
			
			return Promise.reject("no word here"); //指定文字がなかった時。引数で与えられた理由でPromiseオブジェクトを返却
		}
		
		let matcher = document.getText(wordRange).match(this.regExp);
		let markdownText = this.createMarkdownText(this.jsonTyranoSnipet["["+matcher[1]+"]"]);
		if(!markdownText){
			return Promise.reject("unmatched."); //指定文字がなかった時。引数で与えられた理由でPromiseオブジェクトを返却
		}
		return new vscode.Hover(markdownText);//解決したPromiseオブジェクトを返却。この場合、現在の文字列を返却	
	}
}

class OutlineProvider{
	constructor() {
		this.regExp = /((\w+))\s*((\S*)=\"?(\w*)\"?)*()/;
		this.MATCH_TEXTS = ["if","elseif","else", "endif","ignore","endignore","jump", "call","button","link","s", "iscript", "endscript", "loadjs"];
	}
	async provideDocumentSymbols(document, token){
		let symbols = [];
		for (let i = 0; i < document.lineCount; i++) {
			let line = document.lineAt(i);//i行目のドキュメントを取得
			let match = line.text.match(this.regExp);//[hoge param=""]の形式のタグでマッチしてるかを探して変数に格納
			if(!match){
				// return Promise.reject("unmatched."); //指定文字がなかった時。引数で与えられた理由でPromiseオブジェクトを返却
				continue;
			}
			let matchText = match[1];

			//matchTextがMATCH_TEXTSで定義したいずれかのタグがあるならアウトラインに表示
			for(let j = 0; j < this.MATCH_TEXTS.length; j++){
				if(matchText === this.MATCH_TEXTS[j]){
					let symbol = new vscode.DocumentSymbol(line.text, 'Component', vscode.SymbolKind.Class, line.range, line.range);
					symbols.push(symbol);	
				}
			}

			//ラベルをアウトラインに表示
			if(line.text.startsWith("*")){
				let symbol = new vscode.DocumentSymbol(line.text, 'Component', vscode.SymbolKind.Function, line.range, line.range);
				symbols.push(symbol);
			}


		}
		return symbols;

	}
}

function activate(context){
	//登録処理
	//サブスクリプションを登録することで、拡張機能がアンロードされたときにコマンドを解除してくれる
	context.subscriptions.push(vscode.languages.registerHoverProvider(TYRANO_MODE, new TagHoverProvider()));
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(TYRANO_MODE, new OutlineProvider()));

}

function deactivate(){
	return undefined;
}

//モジュールを他のプログラムで使用できるようにする
module.exports = {activate, deactivate};