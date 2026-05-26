package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	govndb "git.nyne.dev/o/go_vndb"
)

// ---- Config ----------------------------------------------------------------

type Config struct {
	AuthToken  string
	ServerHost string
}

func loadConfig() Config {
	file, err := os.Open("scripts/update_relations/.env")
	if err == nil {
		defer file.Close()
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				os.Setenv(strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]))
			}
		}
	}
	return Config{
		AuthToken:  os.Getenv("Auth_Token"),
		ServerHost: os.Getenv("Server_Host"),
	}
}

// ---- Local API types -------------------------------------------------------

type apiResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data"`
	Message string `json:"message"`
}

type pageResponse[T any] struct {
	Success    bool   `json:"success"`
	TotalPages int    `json:"totalPages"`
	Data       []T    `json:"data"`
	Message    string `json:"message"`
}

type resourceSummary struct {
	ID    uint   `json:"id"`
	Title string `json:"title"`
}

type link struct {
	URL   string `json:"url"`
	Label string `json:"label"`
}

type tagView struct {
	ID uint `json:"id"`
}

type imageView struct {
	ID uint `json:"id"`
}

type characterView struct {
	Name  string   `json:"name"`
	Alias []string `json:"alias"`
	CV    string   `json:"cv"`
	Role  string   `json:"role"`
	Image uint     `json:"image"`
}

type relationView struct {
	Resource struct {
		ID    uint   `json:"id"`
		Title string `json:"title"`
	} `json:"resource"`
	Description string `json:"description"`
}

type resourceDetail struct {
	ID                uint            `json:"id"`
	Title             string          `json:"title"`
	AlternativeTitles []string        `json:"alternativeTitles"`
	Links             []link          `json:"links"`
	Article           string          `json:"article"`
	ReleaseDate       *time.Time      `json:"releaseDate"`
	Tags              []tagView       `json:"tags"`
	Images            []imageView     `json:"images"`
	CoverID           *uint           `json:"coverId"`
	Gallery           []uint          `json:"gallery"`
	GalleryNsfw       []uint          `json:"galleryNsfw"`
	Characters        []characterView `json:"characters"`
	Relations         []relationView  `json:"relations"`
}

// foundResource matches the JSON shape of model.Resource (gorm.Model uses PascalCase keys).
type foundResource struct {
	ID    uint   `json:"ID"`
	Title string `json:"Title"`
}

// ---- Update request types --------------------------------------------------

type relationParam struct {
	ToID        uint   `json:"to_id"`
	Description string `json:"description"`
}

type characterParam struct {
	Name  string   `json:"name"`
	Alias []string `json:"alias"`
	CV    string   `json:"cv"`
	Role  string   `json:"role"`
	Image uint     `json:"image"`
}

type resourceParams struct {
	Title             string           `json:"title"`
	AlternativeTitles []string         `json:"alternative_titles"`
	Links             []link           `json:"links"`
	ReleaseDate       string           `json:"release_date"`
	Tags              []uint           `json:"tags"`
	Article           string           `json:"article"`
	Images            []uint           `json:"images"`
	CoverID           *uint            `json:"cover_id"`
	Gallery           []uint           `json:"gallery"`
	GalleryNsfw       []uint           `json:"gallery_nsfw"`
	Characters        []characterParam `json:"characters"`
	Relations         []relationParam  `json:"relations"`
}

// ---- HTTP client -----------------------------------------------------------

type client struct {
	cfg  Config
	http *http.Client
}

func newClient(cfg Config) *client {
	return &client{cfg: cfg, http: &http.Client{Timeout: 30 * time.Second}}
}

func (c *client) doGet(path string, out any) (int, error) {
	url := strings.TrimRight(c.cfg.ServerHost, "/") + path
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Cookie", "token=" + c.cfg.AuthToken)
	resp, err := c.http.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return resp.StatusCode, fmt.Errorf("decode response: %w", err)
	}
	return resp.StatusCode, nil
}

func (c *client) doPost(path string, body any) error {
	url := strings.TrimRight(c.cfg.ServerHost, "/") + path
	data, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Cookie", "token=" + c.cfg.AuthToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d for POST %s", resp.StatusCode, path)
	}
	return nil
}

func (c *client) listAllResourceIDs() ([]uint, error) {
	var ids []uint
	for page := 1; ; page++ {
		var resp pageResponse[resourceSummary]
		status, err := c.doGet(fmt.Sprintf("/api/resource/admin/all?page=%d", page), &resp)
		if err != nil {
			return nil, fmt.Errorf("page %d: %w", page, err)
		}
		if status != http.StatusOK {
			return nil, fmt.Errorf("page %d: HTTP %d", page, status)
		}
		for _, r := range resp.Data {
			ids = append(ids, r.ID)
		}
		if page >= resp.TotalPages || len(resp.Data) == 0 {
			break
		}
	}
	return ids, nil
}

func (c *client) getDetail(id uint) (*resourceDetail, error) {
	var resp apiResponse[resourceDetail]
	status, err := c.doGet(fmt.Sprintf("/api/resource/%d", id), &resp)
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", status)
	}
	return &resp.Data, nil
}

// findByVNID returns (resource, found, error).
func (c *client) findByVNID(vnID string) (*foundResource, bool, error) {
	var resp apiResponse[foundResource]
	status, err := c.doGet("/api/resource/vndb/find?vnid="+vnID, &resp)
	if err != nil {
		return nil, false, err
	}
	if status == http.StatusNotFound {
		return nil, false, nil
	}
	if status != http.StatusOK {
		return nil, false, fmt.Errorf("HTTP %d", status)
	}
	return &resp.Data, true, nil
}

func (c *client) updateResource(id uint, params resourceParams) error {
	return c.doPost(fmt.Sprintf("/api/resource/%d", id), params)
}

// ---- Helpers ---------------------------------------------------------------

var vndbIDRe = regexp.MustCompile(`vndb\.org/(v\w+)`)

func extractVNDBID(links []link) string {
	for _, l := range links {
		if m := vndbIDRe.FindStringSubmatch(l.URL); len(m) > 1 {
			return m[1]
		}
	}
	return ""
}

func relationTypeZh(rt govndb.RelationType) string {
	switch rt {
	case govndb.RelationTypeSameSeries:
		return "同系列"
	case govndb.RelationTypePrequel:
		return "前作"
	case govndb.RelationTypeSequel:
		return "续集"
	case govndb.RelationTypeAlternativeVersion:
		return "替代版本"
	case govndb.RelationTypeFandisc:
		return "Fandisc"
	case govndb.RelationTypeSameSetting:
		return "同世界观"
	case govndb.RelationTypeOriginalWork:
		return "原作"
	case govndb.RelationTypeSideStory:
		return "附加故事"
	default:
		return string(rt)
	}
}

func detailToParams(d *resourceDetail) resourceParams {
	tagIDs := make([]uint, len(d.Tags))
	for i, t := range d.Tags {
		tagIDs[i] = t.ID
	}
	imageIDs := make([]uint, len(d.Images))
	for i, img := range d.Images {
		imageIDs[i] = img.ID
	}
	chars := make([]characterParam, len(d.Characters))
	for i, ch := range d.Characters {
		chars[i] = characterParam{
			Name:  ch.Name,
			Alias: ch.Alias,
			CV:    ch.CV,
			Role:  ch.Role,
			Image: ch.Image,
		}
	}
	rels := make([]relationParam, len(d.Relations))
	for i, rel := range d.Relations {
		rels[i] = relationParam{
			ToID:        rel.Resource.ID,
			Description: rel.Description,
		}
	}
	releaseDate := ""
	if d.ReleaseDate != nil {
		releaseDate = d.ReleaseDate.Format("2006-01-02")
	}
	gallery := d.Gallery
	if gallery == nil {
		gallery = []uint{}
	}
	galleryNsfw := d.GalleryNsfw
	if galleryNsfw == nil {
		galleryNsfw = []uint{}
	}
	return resourceParams{
		Title:             d.Title,
		AlternativeTitles: d.AlternativeTitles,
		Links:             d.Links,
		ReleaseDate:       releaseDate,
		Tags:              tagIDs,
		Article:           d.Article,
		Images:            imageIDs,
		CoverID:           d.CoverID,
		Gallery:           gallery,
		GalleryNsfw:       galleryNsfw,
		Characters:        chars,
		Relations:         rels,
	}
}

// ---- Main ------------------------------------------------------------------

func main() {
	cfg := loadConfig()
	if cfg.ServerHost == "" {
		log.Fatal("Server_Host 未设置，请在 .env 文件中配置")
	}
	if cfg.AuthToken == "" {
		log.Fatal("Auth_Token 未设置，请在 .env 文件中配置")
	}

	c := newClient(cfg)

	log.Println("正在获取所有资源 ID ...")
	ids, err := c.listAllResourceIDs()
	if err != nil {
		log.Fatalf("获取资源列表失败: %v", err)
	}
	log.Printf("共找到 %d 个资源，开始处理", len(ids))

	for _, id := range ids {
		detail, err := c.getDetail(id)
		if err != nil {
			log.Printf("[ERROR] 资源 %d 详情获取失败: %v", id, err)
			continue
		}

		vnID := extractVNDBID(detail.Links)
		if vnID == "" {
			continue
		}

		log.Printf("[INFO]  处理资源 #%d「%s」(VNDB: %s)", id, detail.Title, vnID)

		vn, err := govndb.GetVN(vnID)
		if err != nil {
			log.Printf("[ERROR] 资源 #%d「%s」查询 VNDB %s 失败: %v", id, detail.Title, vnID, err)
			time.Sleep(time.Second)
			continue
		}

		if len(vn.Relations) == 0 {
			time.Sleep(500 * time.Millisecond)
			continue
		}

		// Build set of already-linked resource IDs to avoid duplicates.
		linked := make(map[uint]bool, len(detail.Relations))
		for _, rel := range detail.Relations {
			linked[rel.Resource.ID] = true
		}

		params := detailToParams(detail)
		changed := false

		for _, vnRel := range vn.Relations {
			if vnRel.Relation == govndb.RelationTypeSharedCharacters {
				continue
			}
			related, found, err := c.findByVNID(vnRel.ID)
			if err != nil {
				log.Printf("[ERROR] 资源 #%d「%s」查询关联 VNDB %s 时出错: %v", id, detail.Title, vnRel.ID, err)
				continue
			}
			if !found {
				log.Printf("[MISS]  资源 #%d「%s」的关联作品缺失 — VNDB: %s「%s」(类型: %s)",
					id, detail.Title, vnRel.ID, vnRel.Title, vnRel.Relation)
				continue
			}
			if related.ID == id || linked[related.ID] {
				continue
			}

			desc := relationTypeZh(vnRel.Relation)
			params.Relations = append(params.Relations, relationParam{
				ToID:        related.ID,
				Description: desc,
			})
			linked[related.ID] = true
			changed = true
			log.Printf("[LINK]  资源 #%d「%s」→ 资源 #%d「%s」(%s)",
				id, detail.Title, related.ID, related.Title, desc)
		}

		if changed {
			if err := c.updateResource(id, params); err != nil {
				log.Printf("[ERROR] 资源 #%d「%s」更新失败: %v", id, detail.Title, err)
			} else {
				log.Printf("[OK]    资源 #%d「%s」关系已更新", id, detail.Title)
			}
		}

		// Be polite to the VNDB API.
		time.Sleep(2000 * time.Millisecond)
	}

	log.Println("全部处理完成")
}
