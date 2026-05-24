package model

type Relation struct {
	FromID      int64 `gorm:"index:idx_from_to,unique"`
	ToID        int64 `gorm:"index:idx_from_to,unique"`
	Description string
}

type RelationView struct {
	Resource    ResourceView `json:"resource"`
	Description string       `json:"description"`
}
