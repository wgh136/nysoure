package model

type Charactor struct {
	ID         uint     `gorm:"primaryKey;autoIncrement"`
	Name       string   `gorm:"type:varchar(100);not null"`
	Alias      []string `gorm:"serializer:json"`
	CV         string   `gorm:"type:varchar(100)"`
	ImageID    uint
	ResourceID uint
	Image      *Image `gorm:"foreignKey:ImageID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
}

type CharactorView struct {
	Id    uint     `json:"id"`
	Name  string   `json:"name"`
	Alias []string `json:"alias"`
	CV    string   `json:"cv"`
	Image uint     `json:"image"`
}

func (c *Charactor) ToView() *CharactorView {
	return &CharactorView{
		Id:    c.ID,
		Name:  c.Name,
		Alias: c.Alias,
		CV:    c.CV,
		Image: c.ImageID,
	}
}

func (c *Charactor) Equal(other *Charactor) bool {
	if c.Name != other.Name || c.CV != other.CV || c.ImageID != other.ImageID {
		return false
	}
	if len(c.Alias) != len(other.Alias) {
		return false
	}
	for i := range c.Alias {
		if c.Alias[i] != other.Alias[i] {
			return false
		}
	}
	return true
}
