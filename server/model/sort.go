package model

type RSort uint8

const (
	RSortTimeAsc RSort = iota
	RSortTimeDesc
	RSortViewsAsc
	RSortViewsDesc
	RSortDownloadsAsc
	RSortDownloadsDesc
)
