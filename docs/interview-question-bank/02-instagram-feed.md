---
id: system-design-q2
slug: instagram-feed
title: 圖片動態牆 Instagram Feed
difficulty: intermediate
durationMinutes: 35
order: 2
---

# Q2 — 圖片動態牆 Instagram Feed

**難度：** 中等
**建議時間：** 35 分鐘

## 情境

設計一個圖片動態牆。使用者可以上傳照片、追蹤其他使用者，並看到一條依時間排序的動態牆。

## 功能需求

- 上傳照片，包含原圖與多種縮圖尺寸。
- 追蹤與取消追蹤其他使用者。
- 取得依時間排序且支援分頁的 feed。

## 非功能需求

請將下列數值填入 System Params：

| 參數 | 目標值 |
| --- | --- |
| DAU | 50,000,000 |
| 上傳 | 200 萬張／天，平均 2MB |
| Feed 讀取 | 每人每天 20 次 |
| 每日資料成長 | 約 4TB（`dailyGrowthGB: 4000`） |
| Peak QPS | 30,000（讀取） |
| 延遲目標 | Feed p99 < 200ms |

## 面試官追問

- Feed 應使用 push（寫擴散）還是 pull（讀擴散）？
- 名人擁有 1,000 萬名追蹤者時，如何處理 hot key 與扇出問題？
- 縮圖應同步還是非同步產生？
- 圖片本身是否應經過你的 service？為什麼？

## 交卷補充

除了架構圖，請附上容量估算過程，以及至少一個關鍵 trade-off 的取捨理由。完整格式請參考[題庫首頁](./README.md#交卷方式)。
