---
id: system-design-q5
slug: notification-service
title: 通知系統 Notification Service
difficulty: advanced
durationMinutes: 35
order: 5
---

# Q5 — 通知系統 Notification Service

**難度：** 高難度
**建議時間：** 35 分鐘

## 情境

設計一套供平台內部服務呼叫的通知系統，負責發送 Email、SMS 與 App Push。第三方供應商並不穩定，可能失敗或超時。

## 功能需求

- 多通道發送：Email、SMS、App Push。
- 管理使用者偏好與退訂。
- 樣板管理。
- 排程發送。
- 發送狀態追蹤與重試。

## 非功能需求

請將下列數值填入 System Params：

| 參數 | 目標值 |
| --- | --- |
| 訊息量 | 1 億則／天 |
| Peak QPS | 20,000 |
| 傳送要求 | 不可漏發，同一則通知不可重複發送 |
| 第三方 SLA | 99%，且可能失敗或超時 |
| 延遲目標 | 交易類 < 5 秒；行銷類允許延遲 |

## 面試官追問

- 使用 at-least-once MQ 時，如何確保通知不會重複發送？冪等鍵放在哪裡？
- 第三方供應商故障時如何處理？說明 retry with backoff、circuit breaker 與 DLQ 的設計。
- 交易類與行銷類通知是否應使用不同 queue？為什麼？
- 如何避免大量行銷通知阻塞交易通知？

## 交卷補充

除了架構圖，請附上容量估算過程，以及至少一個關鍵 trade-off 的取捨理由。完整格式請參考[題庫首頁](./README.md#交卷方式)。
