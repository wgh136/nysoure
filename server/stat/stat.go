package stat

import (
	prom "github.com/prometheus/client_golang/prometheus"
)

var (
	RequestCount = prom.NewCounterVec(
		prom.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"path", "status"},
	)
	RegisterCount = prom.NewCounterVec(
		prom.CounterOpts{
			Name: "register_requests_total",
			Help: "Total number of registration requests",
		},
		[]string{},
	)
	DownloadCount = prom.NewCounterVec(
		prom.CounterOpts{
			Name: "download_requests_total",
			Help: "Total number of download requests",
		},
		[]string{},
	)
)

func init() {
	prom.MustRegister(RequestCount)
	prom.MustRegister(RegisterCount)
	prom.MustRegister(DownloadCount)
}

func RecordRequest(method, path string, status string) {
	if status == "404" {
		// Aggregate all 404s under a single label
		path = "NOT_FOUND"
	}
	path = method + " " + path
	RequestCount.WithLabelValues(path, status).Inc()
}

func RecordRegister() {
	RegisterCount.WithLabelValues().Inc()
}

func RecordDownload() {
	DownloadCount.WithLabelValues().Inc()
}
