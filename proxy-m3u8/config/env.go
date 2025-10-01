package config

import (
	"os"
)

type envConfig struct {
	Port               string
	CorsDomain         string
	RedpandaBrokers    string
	RedpandaTopic      string
	EnableStreamingMetrics bool
}

var Env envConfig

func getEnv(varName, defaultValue string) string {
	value, exists := os.LookupEnv(varName)
	if !exists {
		return defaultValue
	}
	return value
}

func InitConfig() {
	Env = envConfig{
		Port:                  getEnv("PORT", "3000"),
		CorsDomain:            getEnv("CORS_DOMAIN", "*"),
		RedpandaBrokers:       getEnv("REDPANDA_BROKERS", "localhost:9092"),
		RedpandaTopic:         getEnv("REDPANDA_TOPIC", "proxy-metrics"),
		EnableStreamingMetrics: getEnv("ENABLE_STREAMING_METRICS", "false") == "true",
	}
}
