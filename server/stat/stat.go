package stat

import (
	"time"

	prom "github.com/prometheus/client_golang/prometheus"
	ipstat "github.com/wgh136/gopkg/ip_stat"
)

var (
	IpStat       = ipstat.NewIPStat(24 * time.Hour)
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
	IpCount = prom.NewGauge(
		prom.GaugeOpts{
			Name: "unique_ip_count",
			Help: "Number of unique IPs in the last 24 hours",
		},
	)
)

func init() {
	prom.MustRegister(RequestCount)
	prom.MustRegister(RegisterCount)
	prom.MustRegister(DownloadCount)
	prom.MustRegister(IpCount)
}

func RecordRequest(method, path string, status string, ip string) {
	if status == "404" {
		// Aggregate all 404s under a single label
		path = "NOT_FOUND"
	}
	path = method + " " + path
	RequestCount.WithLabelValues(path, status).Inc()
	IpStat.Add(ip)
	IpCount.Set(float64(IpStat.Count()))
}

func RecordRegister() {
	RegisterCount.WithLabelValues().Inc()
}

func RecordDownload() {
	DownloadCount.WithLabelValues().Inc()
}
