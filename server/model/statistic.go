package model

type Statistic struct {
	Key   string `gorm:"primaryKey"`
	Value int64
}
