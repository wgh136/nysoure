package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"nysoure/server/cache"
	"nysoure/server/config"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/search"
	"nysoure/server/utils"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"

	"gorm.io/gorm"
)

const (
	maxSearchQueryLength = 100
)

type ResourceParams struct {
	Title             string            `json:"title" binding:"required"`
	AlternativeTitles []string          `json:"alternative_titles"`
	Links             []model.Link      `json:"links"`
	ReleaseDate       string            `json:"release_date"`
	Tags              []uint            `json:"tags"`
	Article           string            `json:"article"`
	Images            []uint            `json:"images"`
	CoverID           *uint             `json:"cover_id"`
	Gallery           []uint            `json:"gallery"`
	GalleryNsfw       []uint            `json:"gallery_nsfw"`
	Characters        []CharacterParams `json:"characters"`
}

type CharacterParams struct {
	Name  string   `json:"name" binding:"required"`
	Alias []string `json:"alias"`
	CV    string   `json:"cv"`
	Role  string   `json:"role"`
	Image uint     `json:"image"`
}

func CreateResource(uid uint, params *ResourceParams) (uint, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		return 0, err
	}
	if !canUpload {
		return 0, model.NewUnAuthorizedError("You have not permission to upload resources")
	}

	images := make([]model.Image, len(params.Images))
	for i, id := range params.Images {
		images[i] = model.Image{
			Model: gorm.Model{
				ID: id,
			},
		}
	}
	tags := make([]model.Tag, len(params.Tags))
	for i, id := range params.Tags {
		tags[i] = model.Tag{
			Model: gorm.Model{
				ID: id,
			},
		}
	}
	gallery := make([]uint, 0, len(params.Gallery))
	for _, id := range params.Gallery {
		if slices.Contains(params.Images, id) {
			gallery = append(gallery, id)
		}
	}
	nsfw := make([]uint, 0, len(params.GalleryNsfw))
	for _, id := range params.GalleryNsfw {
		if slices.Contains(gallery, id) {
			nsfw = append(nsfw, id)
		}
	}
	characters := make([]model.Character, len(params.Characters))
	for i, c := range params.Characters {
		role := c.Role
		if role == "" {
			role = "primary"
		}
		var imageID *uint
		if c.Image != 0 {
			imageID = &c.Image
		}
		characters[i] = model.Character{
			Name:    c.Name,
			Alias:   c.Alias,
			CV:      c.CV,
			Role:    role,
			ImageID: imageID,
		}
	}
	var date *time.Time
	if params.ReleaseDate != "" {
		parsedDate, err := time.Parse("2006-01-02", params.ReleaseDate)
		if err != nil {
			return 0, model.NewRequestError("Invalid release date format, expected YYYY-MM-DD")
		}
		date = &parsedDate
	}
	// Validate CoverID if provided
	var coverID *uint
	if params.CoverID != nil && *params.CoverID != 0 {
		if !slices.Contains(params.Images, *params.CoverID) {
			return 0, model.NewRequestError("Cover ID must be one of the resource images")
		}
		coverID = params.CoverID
	}
	r := model.Resource{
		Title:             params.Title,
		AlternativeTitles: params.AlternativeTitles,
		Article:           params.Article,
		Links:             params.Links,
		ReleaseDate:       date,
		Images:            images,
		CoverID:           coverID,
		Tags:              tags,
		UserID:            uid,
		Gallery:           gallery,
		GalleryNsfw:       nsfw,
		Characters:        characters,
	}
	if r, err = dao.CreateResource(r); err != nil {
		return 0, err
	}
	err = updateCachedTagList()
	if err != nil {
		log.Error("Error updating cached tag list:", err)
	}
	err = dao.AddNewResourceActivity(uid, r.ID)
	if err != nil {
		log.Error("AddNewResourceActivity error: ", err)
	}
	if err := search.AddResourceToIndex(r); err != nil {
		log.Error("AddResourceToIndex error: ", err)
	}
	return r.ID, nil
}

func findRelatedResources(r model.Resource, host string) []model.ResourceView {
	lines := strings.Split(r.Article, "\n")
	var relatedResources []model.ResourceView
	for _, line := range lines {
		r := parseResourceIfPresent(line, host)
		if r != nil {
			relatedResources = append(relatedResources, *r)
		}
	}
	return relatedResources
}

func parseResourceIfPresent(line string, host string) *model.ResourceView {
	if len(line) < 4 {
		return nil
	}
	if !strings.HasPrefix(line, "[") || !strings.HasSuffix(line, ")") {
		return nil
	}
	if !strings.Contains(line, "](") {
		return nil
	}
	splites := strings.Split(line, "(")
	if len(splites) != 2 {
		return nil
	}
	u := strings.TrimSuffix(splites[1], ")")
	u = strings.TrimSpace(u)
	parsed, err := url.Parse(u)
	if err != nil {
		return nil
	}
	if parsed.IsAbs() && parsed.Hostname() != host {
		return nil
	}
	path := parsed.Path
	if !strings.HasPrefix(path, "/resources/") {
		return nil
	}
	idStr := strings.TrimPrefix(path, "/resources/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return nil
	}
	r, err := dao.GetResourceByID(uint(id))
	if err != nil {
		return nil
	}
	v := r.ToView()
	return &v
}

func GetResource(id uint, host string, ctx fiber.Ctx) (*model.ResourceDetailView, error) {
	r, err := dao.GetResourceByID(id)
	if err != nil {
		return nil, err
	}
	if ctx != nil && ctx.Locals("real_user") == true {
		err = dao.AddResourceViewCount(id)
		if err != nil {
			log.Error("AddResourceViewCount error: ", err)
		}
	}
	v := r.ToDetailView()
	if host != "" {
		related := findRelatedResources(r, host)
		v.Related = related
	}
	fillRatings(&v)
	_, ok := ctx.Locals("uid").(uint)
	if !ok {
		removeNsfwImages(&v)
	}
	return &v, nil
}

func GetResourceList(page int, sort model.RSort) ([]model.ResourceView, int, error) {
	resources, totalPages, err := dao.GetResourceList(page, pageSize, sort)
	if err != nil {
		return nil, 0, err
	}
	var views []model.ResourceView
	for _, r := range resources {
		views = append(views, r.ToView())
	}
	return views, totalPages, nil
}

// splitQuery splits the input query string into keywords, treating quoted substrings (single or double quotes)
// as single keywords and supporting escape characters for quotes. Spaces outside quotes are used as separators.
func splitQuery(query string) []string {
	var keywords []string

	query = strings.TrimSpace(query)
	if query == "" {
		return keywords
	}

	l, r := 0, 0
	inQuote := false
	quoteChar := byte(0)

	for r < len(query) {
		if (query[r] == '"' || query[r] == '\'') && (r == 0 || query[r-1] != '\\') {
			if !inQuote {
				inQuote = true
				quoteChar = query[r]
				l = r + 1
			} else if query[r] == quoteChar {
				if r > l {
					keywords = append(keywords, strings.TrimSpace(query[l:r]))
				}
				inQuote = false
				r++
				l = r
				continue
			}
		} else if !inQuote && query[r] == ' ' {
			if r > l {
				keywords = append(keywords, strings.TrimSpace(query[l:r]))
			}
			for r < len(query) && query[r] == ' ' {
				r++
			}
			l = r
			continue
		}

		r++
	}

	if l < len(query) {
		keywords = append(keywords, strings.TrimSpace(query[l:r]))
	}

	return keywords
}

func searchWithKeyword(keyword string) ([]uint, error) {
	resources := make([]uint, 0)

	if len([]rune(keyword)) <= maxTagLength {
		exists, err := dao.ExistsTag(keyword)
		if err != nil {
			return nil, err
		}
		if exists {
			t, err := dao.GetTagByName(keyword)
			if err != nil {
				return nil, err
			}
			res, err := dao.GetResourcesIdWithTag(t.ID)
			if err != nil {
				return nil, err
			}
			resources = append(resources, res...)
		}
	}

	searchResult, err := search.SearchResource(keyword)
	if err != nil {
		return nil, err
	}

	resources = append(resources, searchResult...)

	return resources, nil
}

func SearchResource(query string, page int) ([]model.ResourceView, int, error) {
	if len([]rune(query)) > maxSearchQueryLength {
		return nil, 0, model.NewRequestError("Search query is too long")
	}

	start := (page - 1) * pageSize
	end := start + pageSize
	resources := make([]uint, 0)

	checkTag := func(tag string) error {
		if len([]rune(tag)) > maxTagLength {
			return nil
		}
		exists, err := dao.ExistsTag(tag)
		if err != nil {
			return err
		}
		if exists {
			t, err := dao.GetTagByName(tag)
			if err != nil {
				return err
			}
			res, err := dao.GetResourcesIdWithTag(t.ID)
			if err != nil {
				return err
			}
			resources = append(resources, res...)
		}
		return nil
	}

	// check tag
	if err := checkTag(query); err != nil {
		return nil, 0, err
	}

	// check tag after removing spaces
	trimmed := utils.RemoveSpaces(query)
	if trimmed != query {
		if err := checkTag(trimmed); err != nil {
			return nil, 0, err
		}
	}

	// split query to search
	keywords := splitQuery(query)
	var temp []uint
	haveTag := false
	for _, keyword := range keywords {
		if len([]rune(keyword)) <= maxTagLength {
			exists, err := dao.ExistsTag(keyword)
			if err != nil {
				return nil, 0, err
			}
			if exists {
				haveTag = true
			}
		}
	}
	if haveTag {
		first := true
		for _, keyword := range keywords {
			if keyword == "" {
				continue
			}
			if utils.OnlyPunctuation(keyword) {
				continue
			}

			res, err := searchWithKeyword(keyword)
			if err != nil {
				return nil, 0, err
			}
			if len(res) == 0 && search.IsStopWord(keyword) {
				continue
			}
			if first {
				temp = utils.RemoveDuplicate(res)
				first = false
			} else {
				temp1 := make([]uint, 0)
				for _, id := range temp {
					for _, id2 := range res {
						if id == id2 {
							temp1 = append(temp1, id)
							break
						}
					}
				}
				temp = temp1
			}
		}
	} else {
		res, err := searchWithKeyword(query)
		if err != nil {
			return nil, 0, err
		}
		temp = res
	}
	resources = append(resources, temp...)
	resources = utils.RemoveDuplicate(resources)

	if start >= len(resources) {
		return []model.ResourceView{}, 0, nil
	}

	total := len(resources)
	totalPages := (total + pageSize - 1) / pageSize
	if start >= total {
		return []model.ResourceView{}, totalPages, nil
	}
	if end > total {
		end = total
	}
	idsPage := resources[start:end]

	resourcesPage, err := dao.BatchGetResources(idsPage)
	if err != nil {
		return nil, 0, err
	}
	var views []model.ResourceView
	for _, r := range resourcesPage {
		views = append(views, r.ToView())
	}
	return views, totalPages, nil
}

func DeleteResource(uid, id uint) error {
	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		return err
	}
	if !isAdmin {
		r, err := dao.GetResourceByID(id)
		if err != nil {
			return err
		}
		if r.UserID != uid {
			return model.NewUnAuthorizedError("You have not permission to delete this resource")
		}
	}
	r, err := GetResource(id, "", nil)
	if err != nil {
		return err
	}
	if len(r.Files) > 0 {
		return model.NewRequestError("This resource has files, please delete them first")
	}
	if err := dao.DeleteResource(id); err != nil {
		return err
	}
	err = updateCachedTagList()
	if err != nil {
		log.Error("Error updating cached tag list:", err)
	}
	if err := search.RemoveResourceFromIndex(id); err != nil {
		log.Error("RemoveResourceFromIndex error: ", err)
	}
	return nil
}

func GetResourcesWithTag(tag string, page int) ([]model.ResourceView, int, error) {
	t, err := dao.GetTagByName(tag)
	if err != nil {
		return nil, 0, err
	}
	tagID := t.ID
	resources, totalPages, err := dao.GetResourceByTag(tagID, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	var views []model.ResourceView
	for _, r := range resources {
		views = append(views, r.ToView())
	}
	return views, totalPages, nil
}

func GetResourcesWithUser(username string, page int) ([]model.ResourceView, int, error) {
	resources, totalPages, err := dao.GetResourcesByUsername(username, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	var views []model.ResourceView
	for _, r := range resources {
		views = append(views, r.ToView())
	}
	return views, totalPages, nil
}

func UpdateResource(uid, rid uint, params *ResourceParams) error {
	isAdmin, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("checkUserCanUpload error: ", err)
		return model.NewInternalServerError("Failed to check user permission")
	}
	r, err := dao.GetResourceByID(rid)
	if err != nil {
		return err
	}
	if r.UserID != uid && !isAdmin {
		return model.NewUnAuthorizedError("You have not permission to edit this resource")
	}

	gallery := make([]uint, 0, len(params.Gallery))
	for _, id := range params.Gallery {
		if slices.Contains(params.Images, id) {
			gallery = append(gallery, id)
		}
	}
	nsfw := make([]uint, 0, len(params.GalleryNsfw))
	for _, id := range params.GalleryNsfw {
		if slices.Contains(gallery, id) {
			nsfw = append(nsfw, id)
		}
	}
	characters := make([]model.Character, len(params.Characters))
	for i, c := range params.Characters {
		role := c.Role
		if role == "" {
			role = "primary"
		}
		var imageID *uint
		if c.Image != 0 {
			imageID = &c.Image
		}
		characters[i] = model.Character{
			Name:    c.Name,
			Alias:   c.Alias,
			CV:      c.CV,
			Role:    role,
			ImageID: imageID,
		}
	}

	var date *time.Time
	if params.ReleaseDate != "" {
		parsedDate, err := time.Parse("2006-01-02", params.ReleaseDate)
		if err != nil {
			return model.NewRequestError("Invalid release date format, expected YYYY-MM-DD")
		}
		date = &parsedDate
	}

	// Validate CoverID if provided
	var coverID *uint
	if params.CoverID != nil && *params.CoverID != 0 {
		if !slices.Contains(params.Images, *params.CoverID) {
			return model.NewRequestError("Cover ID must be one of the resource images")
		}
		coverID = params.CoverID
	}

	r.Title = params.Title
	r.AlternativeTitles = params.AlternativeTitles
	r.Article = params.Article
	r.Links = params.Links
	r.ReleaseDate = date
	r.CoverID = coverID
	r.Gallery = gallery
	r.GalleryNsfw = nsfw
	r.Characters = characters

	images := make([]model.Image, len(params.Images))
	for i, id := range params.Images {
		images[i] = model.Image{
			Model: gorm.Model{
				ID: id,
			},
		}
	}
	tags := make([]model.Tag, len(params.Tags))
	for i, id := range params.Tags {
		tags[i] = model.Tag{
			Model: gorm.Model{
				ID: id,
			},
		}
	}
	r.Images = images
	r.Tags = tags
	if err := dao.UpdateResource(r); err != nil {
		log.Error("UpdateResource error: ", err)
		return model.NewInternalServerError("Failed to update resource")
	}
	err = updateCachedTagList()
	if err != nil {
		log.Error("Error updating cached tag list:", err)
	}
	err = dao.AddUpdateResourceActivity(uid, r.ID)
	if err != nil {
		log.Error("AddUpdateResourceActivity error: ", err)
	}
	if err := search.AddResourceToIndex(r); err != nil {
		log.Error("AddResourceToIndex error: ", err)
	}
	return nil
}

func RandomResource(host string) (*model.ResourceDetailView, error) {
	r, err := dao.RandomResource()
	if err != nil {
		return nil, err
	}
	v := r.ToDetailView()
	if host != "" {
		related := findRelatedResources(r, host)
		v.Related = related
	}
	fillRatings(&v)
	return &v, nil
}

var lastSuccessCover uint

func RandomCover() (uint, error) {
	for retries := 0; retries < 5; retries++ {
		v, err := dao.RandomResource()
		if err != nil {
			return 0, err
		}
		if len(v.Images) > 0 {
			lastSuccessCover = v.Images[0].ID
			return v.Images[0].ID, nil
		}
	}
	return lastSuccessCover, nil
}

func GetPinnedResources() ([]model.ResourceView, error) {
	ids := config.PinnedResources()
	var views []model.ResourceView
	for _, id := range ids {
		r, err := dao.GetResourceByID(id)
		if err != nil {
			continue
		}
		views = append(views, r.ToView())
	}
	return views, nil
}

func GetCharactersFromVndb(vnID string, uid uint) ([]CharacterParams, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		return nil, err
	}
	if !canUpload {
		return nil, model.NewUnAuthorizedError("You have not permission to fetch characters from VNDB")
	}

	client := http.Client{}
	jsonStr := fmt.Sprintf(`
	{
		"filters": ["id", "=", "%s"],
		"fields": "va.character.name, va.staff.name, va.staff.original, va.character.original, va.character.image.url, va.character.vns.role"
	}
	`, vnID)
	jsonStr = strings.TrimSpace(jsonStr)
	reader := strings.NewReader(jsonStr)
	resp, err := client.Post("https://api.vndb.org/kana/vn", "application/json", reader)
	if err != nil {
		return nil, model.NewInternalServerError("Failed to fetch data from VNDB")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, model.NewInternalServerError("Failed to fetch data from VNDB")
	}
	// 定义 VNDB API 响应结构
	type VndbResponse struct {
		Results []struct {
			ID string `json:"id"`
			VA []struct {
				Character struct {
					ID       string `json:"id"`
					Name     string `json:"name"`
					Original string `json:"original"`
					Image    struct {
						URL string `json:"url"`
					} `json:"image"`
					VNS []struct {
						ID   string `json:"id"`
						Role string `json:"role"`
					} `json:"vns"`
				} `json:"character"`
				Staff struct {
					ID       string `json:"id"`
					Name     string `json:"name"`
					Original string `json:"original"`
				} `json:"staff"`
			} `json:"va"`
		} `json:"results"`
	}

	// 解析响应
	var vndbResp VndbResponse
	if err := json.NewDecoder(resp.Body).Decode(&vndbResp); err != nil {
		return nil, model.NewInternalServerError("Failed to parse VNDB response")
	}

	if len(vndbResp.Results) == 0 {
		return []CharacterParams{}, nil
	}

	result := vndbResp.Results[0]
	var characters []CharacterParams
	processedCharacters := make(map[string]bool) // 避免重复角色

	// 遍历声优信息
	for _, va := range result.VA {
		role := "Unknown"
		for _, vn := range va.Character.VNS {
			if vn.ID == vnID {
				role = vn.Role
				break
			}
		}

		if role != "primary" && role != "side" && role != "main" {
			continue
		}

		// 避免重复角色
		if processedCharacters[va.Character.ID] {
			continue
		}
		processedCharacters[va.Character.ID] = true

		// 优先使用 original 字段作为角色名，如果没有则使用 name
		characterName := strings.ReplaceAll(va.Character.Original, " ", "")
		if characterName == "" {
			characterName = va.Character.Name
		}
		if characterName == "" {
			continue // 跳过没有名字的角色
		}

		// 使用 original 字段作为声优名，如果没有则使用 name
		cvName := strings.ReplaceAll(va.Staff.Original, " ", "")
		if cvName == "" {
			cvName = va.Staff.Name
		}

		character := CharacterParams{
			Name:  characterName,
			Alias: []string{},
			CV:    cvName,
			Role:  role,
			Image: 0, // 默认值，下面会下载图片
		}

		// 下载并保存角色图片
		if va.Character.Image.URL != "" {
			imageID, err := downloadAndCreateImage(va.Character.Image.URL)
			if err != nil {
				log.Error("Failed to download character image:", err)
				// 继续处理，即使图片下载失败
			} else {
				character.Image = imageID
			}
		}

		characters = append(characters, character)
	}

	return characters, nil
}

// downloadAndCreateImage 下载图片并使用 CreateImage 保存
func downloadAndCreateImage(imageURL string) (uint, error) {
	// 创建 HTTP 客户端
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// 下载图片
	resp, err := client.Get(imageURL)
	if err != nil {
		return 0, fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("failed to download image: HTTP %d", resp.StatusCode)
	}

	// 读取图片数据
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read image data: %w", err)
	}

	// 限制图片大小，防止内存溢出
	if len(imageData) > 8*1024*1024 { // 8MB 限制
		return 0, fmt.Errorf("image too large")
	}

	// 使用系统用户ID (假设为1) 创建图片
	// 注意：这里使用系统账户，实际使用时可能需要调整
	imageID, err := CreateImage(1, "127.0.0.1", imageData)
	if err != nil {
		return 0, fmt.Errorf("failed to create image: %w", err)
	}

	return imageID, nil
}

func GetReleaseDateFromVndb(vnID string) (string, error) {
	client := http.Client{}
	jsonStr := fmt.Sprintf(`
	{
		"filters": ["id", "=", "%s"],
		"fields": "released"
	}
	`, vnID)
	jsonStr = strings.TrimSpace(jsonStr)
	reader := strings.NewReader(jsonStr)
	resp, err := client.Post("https://api.vndb.org/kana/vn", "application/json", reader)
	if err != nil {
		return "", model.NewInternalServerError("Failed to fetch data from VNDB")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", model.NewInternalServerError("Failed to fetch data from VNDB")
	}
	// 定义 VNDB API 响应结构
	type VndbResponse struct {
		Results []struct {
			Released string `json:"released"`
		} `json:"results"`
	}
	// 解析响应
	var vndbResp VndbResponse
	if err := json.NewDecoder(resp.Body).Decode(&vndbResp); err != nil {
		return "", model.NewInternalServerError("Failed to parse VNDB response")
	}
	if len(vndbResp.Results) == 0 {
		return "", nil
	}
	released := vndbResp.Results[0].Released
	return released, nil
}

// UpdateCharacterImage 更新角色的图片ID
func UpdateCharacterImage(uid, resourceID, characterID, imageID uint) error {
	// 检查资源是否存在并且用户有权限修改
	resource, err := dao.GetResourceByID(resourceID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return model.NewNotFoundError("Resource not found")
		}
		return err
	}

	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		return err
	}

	// 检查用户是否有权限修改这个资源
	if resource.UserID != uid && !isAdmin {
		return model.NewUnAuthorizedError("You don't have permission to modify this resource")
	}

	// 更新角色图片
	err = dao.UpdateCharacterImage(characterID, imageID)
	if err != nil {
		return err
	}

	return nil
}

// GetLowResolutionCharacters 获取低清晰度的角色图片
func GetLowResolutionCharacters(page int, pageSize int, maxWidth, maxHeight int) ([]model.LowResCharacterView, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50 // 默认每页50个角色
	}
	if pageSize > 1000 {
		pageSize = 1000 // 限制最大页面大小
	}

	offset := (page - 1) * pageSize

	// 获取角色列表
	characters, err := dao.GetLowResolutionCharacters(maxWidth, maxHeight, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	// 获取总数
	totalCount, err := dao.GetLowResolutionCharactersCount(maxWidth, maxHeight)
	if err != nil {
		return nil, 0, err
	}

	totalPages := int((totalCount + int64(pageSize) - 1) / int64(pageSize))

	return characters, totalPages, nil
}

// GetLowResolutionResourceImages 获取低清晰度的资源图片
func GetLowResolutionResourceImages(page int, pageSize int, maxWidth, maxHeight int) ([]model.LowResResourceImageView, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50 // 默认每页50个图片
	}
	if pageSize > 1000 {
		pageSize = 1000 // 限制最大页面大小
	}

	offset := (page - 1) * pageSize

	// 获取资源图片列表
	images, err := dao.GetLowResolutionResourceImages(maxWidth, maxHeight, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	// 获取总数
	totalCount, err := dao.GetLowResolutionResourceImagesCount(maxWidth, maxHeight)
	if err != nil {
		return nil, 0, err
	}

	totalPages := int((totalCount + int64(pageSize) - 1) / int64(pageSize))

	return images, totalPages, nil
}

// UpdateResourceImage 更新资源图片
func UpdateResourceImage(uid, resourceID, oldImageID, newImageID uint) error {
	// 首先检查用户权限 - 确保用户是资源的所有者或管理员
	resource, err := dao.GetResourceByID(resourceID)
	if err != nil {
		return err
	}

	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		return err
	}

	if resource.UserID != uid && !isAdmin {
		return model.NewUnAuthorizedError("You don't have permission to update this resource")
	}

	// 更新资源图片
	return dao.UpdateResourceImage(resourceID, oldImageID, newImageID)
}

func getVNDBRating(vnID string) (int, error) {
	client := http.Client{}
	jsonStr := fmt.Sprintf(`
	{
		"filters": ["id", "=", "%s"],
		"fields": "rating"
	}
	`, vnID)
	jsonStr = strings.TrimSpace(jsonStr)
	reader := strings.NewReader(jsonStr)
	resp, err := client.Post("https://api.vndb.org/kana/vn", "application/json", reader)
	if err != nil {
		return 0, model.NewInternalServerError("Failed to fetch data from VNDB")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, model.NewInternalServerError("Failed to fetch data from VNDB")
	}
	type VndbResponse struct {
		Results []struct {
			Rating float32 `json:"rating"`
		} `json:"results"`
	}
	var vndbResp VndbResponse
	if err := json.NewDecoder(resp.Body).Decode(&vndbResp); err != nil {
		return 0, model.NewInternalServerError("Failed to parse VNDB response: " + err.Error())
	}
	if len(vndbResp.Results) == 0 {
		return 0, nil
	}
	rating := vndbResp.Results[0].Rating
	return int(math.Round(float64(rating))), nil
}

func getVNDBRatingWithCache(vnID string) (int, error) {
	cacheKey := fmt.Sprintf("vndb_rating_%s", vnID)
	ratingStr, err := cache.Get(cacheKey)
	if err != nil && !errors.Is(err, cache.ErrNotFound) {
		return 0, err
	} else if errors.Is(err, cache.ErrNotFound) {
		rating, err := getVNDBRating(vnID)
		if err != nil {
			return 0, err
		}
		err = cache.Set(cacheKey, strconv.Itoa(rating), 24*time.Hour)
		if err != nil {
			log.Error("Failed to set VNDB rating cache: ", err)
		}
		return rating, nil
	}
	rating, err := strconv.Atoi(ratingStr)
	if err != nil {
		return 0, model.NewInternalServerError("Failed to parse VNDB rating")
	}
	return rating, nil
}

func fillRatings(resource *model.ResourceDetailView) {
	ratings := make(map[string]int)
	for _, link := range resource.Links {
		if link.Label == "" {
			continue
		}
		if vnID, ok := strings.CutPrefix(link.URL, "https://vndb.org/v"); ok {
			vnID = strings.TrimSpace(vnID)
			rating, err := getVNDBRatingWithCache(vnID)
			if err == nil {
				ratings[link.Label] = rating
			} else {
				log.Error("Failed to get VNDB rating: ", err)
			}
		}
	}
	resource.Ratings = ratings
}

func removeNsfwImages(r *model.ResourceDetailView) {
	if len(r.GalleryNsfw) == 0 || len(r.Gallery) < len(r.GalleryNsfw) || len(r.Images) < len(r.GalleryNsfw) {
		return
	}
	nsfwImageIDs := make(map[uint]struct{}, len(r.GalleryNsfw))
	for _, id := range r.GalleryNsfw {
		nsfwImageIDs[id] = struct{}{}
	}
	newGalleryIDs := make([]uint, 0, len(r.Gallery)-len(r.GalleryNsfw))
	for _, id := range r.Gallery {
		if _, ok := nsfwImageIDs[id]; ok {
			continue
		}
		newGalleryIDs = append(newGalleryIDs, id)
	}
	newImages := make([]model.ImageView, 0, len(r.Images)-len(r.GalleryNsfw))
	for _, i := range r.Images {
		if _, ok := nsfwImageIDs[i.ID]; ok {
			continue
		}
		newImages = append(newImages, i)
	}
	r.Images = newImages
	r.Gallery = newGalleryIDs
	r.GalleryNsfw = []uint{}
}
