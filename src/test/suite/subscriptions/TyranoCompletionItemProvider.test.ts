import * as assert from 'assert';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { TyranoCompletionItemProvider } from '../../../subscriptions/TyranoCompletionItemProvider';
// import * as myExtension from '../../extension';


suite('TyranoCompletionItemProvider.provideCompletionItems', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('正常系', () => {
    //値定義
    const thp = new TyranoCompletionItemProvider();

    // const excepted = Object.defineProperty(document.lineAt(0), 'text',{
    // 	value:"@elsif exp=\"true\"",
    // 	writable:false,
    // });	

    //実行・期待値
    // let actual = yjp.provideDocumentSymbols(document,token)!;

    //アサート
    // assert.strictEqual(actual[0].name, excepted.text);
  });

});

suite('TyranoCompletionItemProvider.conpletionLabel', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('正常系', () => {

  });

});

suite('TyranoCompletionItemProvider.completionVariable', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('正常系', () => {

  });

});


suite('TyranoCompletionItemProvider.completionFile', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('正常系', () => {

  });

});


suite('TyranoCompletionItemProvider.completionParameter', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('正常系', () => {

  });

});


suite('TyranoCompletionItemProvider.completionTag', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('正常系', () => {
    const tcip = new TyranoCompletionItemProvider();
    (tcip as any).completionTag();

  });

});
