---
id: system-design-q3
slug: realtime-chat
title: 即時聊天系統 LINE / WhatsApp
difficulty: intermediate-advanced
durationMinutes: 40
order: 3
---

# Q3 — 即時聊天系統 LINE / WhatsApp

**難度：** 中高
**建議時間：** 40 分鐘

## 情境

設計一套支援一對一與群組對話的即時聊天系統，並提供已讀回條與離線推播。

## 功能需求

- 即時收發訊息。
- 群組聊天，每個群組上限 500 人。
- 顯示線上狀態。
- 離線訊息補傳。
- 已讀狀態。

## 非功能需求

請將下列數值填入 System Params：

| 參數 | 目標值 |
| --- | --- |
| DAU | 100,000,000 |
| 同時在線長連線 | 2,000 萬 |
| 訊息量 | 500 億則／天 |
| 延遲目標 | 端到端 p99 < 100ms |
| 可用性 | 99.99% |
| 訊息保存 | 伺服器端保存 30 天 |

## 特別要求

處理 WebSocket 長連線的 Service 節點必須將 `stateless` 設為 `false`，並說明原因。若所有 Service 節點均保留預設的 `stateless: true`，將會扣分。

## 面試官追問

- WebSocket 連線狀態應放在哪裡？為什麼對應的 Service 不是 stateless？
- 使用者 A 傳訊息給 B 時，如何得知 B 連線至哪一台 server？
- 如何保證訊息順序？保證範圍是全域、聊天室，還是單一發送者？
- At-least-once 與 exactly-once 會選哪一個？如何處理重複訊息？

## 交卷補充

除了架構圖，請附上容量估算過程，以及至少一個關鍵 trade-off 的取捨理由。完整格式請參考[題庫首頁](./README.md#交卷方式)。
