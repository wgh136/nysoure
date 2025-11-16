package model

type Character struct {
	ID         uint     `gorm:"primaryKey;autoIncrement"`
	Name       string   `gorm:"type:varchar(100);not null"`
	Alias      []string `gorm:"serializer:json"`
	CV         string   `gorm:"type:varchar(100)"`
	Role       string   `gorm:"type:varchar(20);default:primary"`
	ImageID    *uint
	ResourceID uint
	Image      *Image `gorm:"foreignKey:ImageID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
}

type CharacterView struct {
	Id    uint     `json:"id"`
	Name  string   `json:"name"`
	Alias []string `json:"alias"`
	CV    string   `json:"cv"`
	Role  string   `json:"role"`
	Image uint     `json:"image"`
}

func (c *Character) ToView() *CharacterView {
	var imageID uint
	if c.ImageID != nil {
		imageID = *c.ImageID
	}
	return &CharacterView{
		Id:    c.ID,
		Name:  c.Name,
		Alias: c.Alias,
		CV:    c.CV,
		Role:  c.Role,
		Image: imageID,
	}
}

func (c *Character) Equal(other *Character) bool {
	if c.Name != other.Name || c.CV != other.CV || c.Role != other.Role {
		return false
	}
	// Compare ImageID pointers
	if (c.ImageID == nil) != (other.ImageID == nil) {
		return false
	}
	if c.ImageID != nil && other.ImageID != nil && *c.ImageID != *other.ImageID {
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
