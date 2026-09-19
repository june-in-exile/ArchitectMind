---
title: 系統設計面試題庫
questionCount: 5
language: zh-TW
---

# 系統設計面試題庫

這份題庫包含 5 道難度遞增的系統設計題目，可搭配 ArchitectMind 畫布練習。

## 題目索引

| 題號 | 題目 | 難度 | 建議時間 |
| --- | --- | --- | --- |
| Q1 | [短網址服務 TinyURL](./01-tinyurl.md) | 入門 | 20 分鐘 |
| Q2 | [圖片動態牆 Instagram Feed](./02-instagram-feed.md) | 中等 | 35 分鐘 |
| Q3 | [即時聊天系統 LINE / WhatsApp](./03-realtime-chat.md) | 中高 | 40 分鐘 |
| Q4 | [電商限時秒殺](./04-flash-sale.md) | 高難度 | 40 分鐘 |
| Q5 | [通知系統 Notification Service](./05-notification-service.md) | 高難度 | 35 分鐘 |

完整評分方式請參考[評分標準](./SCORING.md)。

## 交卷方式

畫完後，使用以下任一方式交卷：

1. **推薦：** Settings → **Export Mermaid**，貼上匯出的文字。節點、形狀、protocol、sync/async 都會保留。
2. Export Image 或截圖，提供檔案路徑以供檢視。
3. 另外用文字補充 Mermaid 不會包含的資訊：
   - 你填寫的 **System Params**：DAU、QPS、儲存、讀寫比、延遲、可用性。
   - 關鍵節點屬性：Service replicas 與 autoScaling、DB dbType 與 scalingStrategy、Cache TTL 與 eviction、MQ deliveryGuarantee 與 DLQ、Firewall layer 與 mode。
   - 容量估算過程，以及至少一個 trade-off 的取捨理由。這是系統設計面試最大的分水嶺，無法只靠畫布呈現。

## 建議練習順序

先從 Q1 暖身；熟悉流程後，可直接挑戰 Q3 或 Q4，這兩題最接近真實系統設計面試的難度。
