# 回执仓库（gongqi-records）

官方回执签名服务：玩家开 Issue 贴 SGF，Actions 用 `GQ_ROOT_KEY` 签 `RECEIPT[...]`。

## 一次性设置
1. 本仓库 Settings → Secrets and variables → Actions → New repository secret
   - Name: `GQ_ROOT_KEY`
   - Value: 由游戏仓库 `node tools/gen-receipt-root.js` 输出的 `GQ_ROOT_KEY=` 后面那串
2. Settings → Actions → General → Allow all actions
3. 游戏包内置 `receipt-root.pub.json`（公钥指纹 36fc95910a9d18b5），与本仓库私钥配对

## 玩家申请回执
新建 Issue，正文放一个 sgf 代码块：

````
```sgf
(;GM[gongqi]SZ[19];W[3];B[357]AUTH[...])
```
````

Actions 会回帖 `RECEIPT[...]`，并提交到 `receipts/<recordHash>.json`。

## 验证（离线，任何人）
```
node tools/receipt/verify-receipt.js receipt.json receipt-root.pub.json
```

## 防滥用
- 只处理 `issues.opened`，不执行 PR 中的代码
- 正文长度上限、同 hash 去重、每 issue 只签一次
- 可选：`scripts/sign-from-issue.js` 里加账号年龄/黑名单检查
