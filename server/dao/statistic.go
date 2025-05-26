package dao

import (
	"errors"
	"gorm.io/gorm"
	"nysoure/server/model"
)

func GetStatistic(key string) int64 {
	statistic := &model.Statistic{}
	if err := db.Where(&model.Statistic{
		Key: key,
	}).First(statistic).Error; err != nil {
		return 0
	}
	return statistic.Value
}

func UpdateStatistic(key string, offset int64) error {
	return db.Transaction(func(tx *gorm.DB) error {
		statistic := &model.Statistic{}
		if err := tx.Where(&model.Statistic{
			Key: key,
		}).First(statistic).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				statistic.Key = key
				statistic.Value = offset
				return tx.Create(statistic).Error
			}
			return err
		}
		statistic.Value += offset
		return tx.Save(statistic).Error
	})
}
