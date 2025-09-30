package streaming

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

// ProxyRequestEvent represents a proxy request event
type ProxyRequestEvent struct {
	Timestamp    time.Time `json:"timestamp"`
	SessionID    string    `json:"session_id"`
	TargetURL    string    `json:"target_url"`
	Referer      string    `json:"referer"`
	StatusCode   int       `json:"status_code"`
	ResponseTime int64     `json:"response_time_ms"`
	ContentType  string    `json:"content_type"`
	ContentSize  int64     `json:"content_size"`
	UserAgent    string    `json:"user_agent"`
	Success      bool      `json:"success"`
}

// StreamingMetrics handles Redpanda/Kafka integration
type StreamingMetrics struct {
	producer *kafka.Producer
	topic    string
	enabled  bool
}

// NewStreamingMetrics creates a new streaming metrics client
func NewStreamingMetrics(brokers, topic string) (*StreamingMetrics, error) {
	producer, err := kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers": brokers,
		"client.id":         "proxy-m3u8",
		"acks":              "all",
		"retries":           3,
		"retry.backoff.ms":  100,
	})
	
	if err != nil {
		log.Printf("Failed to create Kafka producer: %v", err)
		return &StreamingMetrics{enabled: false}, nil
	}

	// Delivery channel for events (optional, for debugging)
	// deliveryChan := make(chan kafka.Event, 10000)
	// producer.Events(deliveryChan)

	// Optional: Uncomment for delivery event logging
	// go func() {
	// 	for e := range deliveryChan {
	// 		switch ev := e.(type) {
	// 		case *kafka.Message:
	// 			if ev.TopicPartition.Error != nil {
	// 				log.Printf("Delivery failed: %v", ev.TopicPartition.Error)
	// 			}
	// 		}
	// 	}
	// }()

	return &StreamingMetrics{
		producer: producer,
		topic:    topic,
		enabled:  true,
	}, nil
}

// LogProxyRequest sends a proxy request event to Redpanda
func (sm *StreamingMetrics) LogProxyRequest(event *ProxyRequestEvent) error {
	if !sm.enabled {
		return nil
	}

	// Serialize event to JSON
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Send to Redpanda
	err = sm.producer.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{
			Topic:     &sm.topic,
			Partition: kafka.PartitionAny,
		},
		Value: data,
		Key:   []byte(event.SessionID),
	}, nil)

	if err != nil {
		return fmt.Errorf("failed to produce message: %w", err)
	}

	return nil
}

// Close shuts down the streaming metrics client
func (sm *StreamingMetrics) Close() {
	if sm.producer != nil {
		sm.producer.Flush(15 * 1000) // 15 second timeout
		sm.producer.Close()
	}
}

// IsEnabled returns whether streaming metrics are enabled
func (sm *StreamingMetrics) IsEnabled() bool {
	return sm.enabled
}