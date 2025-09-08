package search

import (
	"fmt"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/utils"
	"strconv"
	"time"

	"github.com/blevesearch/bleve"
)

type ResourceParams struct {
	Id        uint
	Title     string
	Subtitles []string
	Time      time.Time
}

var index bleve.Index

func createIndex() error {
	for !dao.IsReady() {
		time.Sleep(1 * time.Second)
	}
	page := 1
	total := 1
	for page <= total {
		res, totalPages, err := dao.GetResourceList(page, 100, model.RSortTimeAsc)
		if err != nil {
			return err
		}
		for _, r := range res {
			err := index.Index(fmt.Sprintf("%d", r.ID), ResourceParams{
				Id:        r.ID,
				Title:     r.Title,
				Subtitles: r.AlternativeTitles,
				Time:      r.CreatedAt,
			})
			if err != nil {
				return err
			}
		}
		page++
		total = totalPages
	}
	return nil
}

func init() {
	indexPath := utils.GetStoragePath() + "/search_index.bleve"

	var err error
	index, err = bleve.Open(indexPath)
	if err == bleve.ErrorIndexPathDoesNotExist {
		mapping := bleve.NewIndexMapping()
		index, err = bleve.New(indexPath, mapping)
		if err != nil {
			panic("Failed to create search index: " + err.Error())
		}
		go createIndex()
	} else if err != nil {
		panic("Failed to open search index: " + err.Error())
	}
}

func SearchResource(keyword string) (map[uint]time.Time, error) {
	query := bleve.NewMatchQuery(keyword)
	searchRequest := bleve.NewSearchRequest(query)
	searchRequest.Size = 10000
	searchRequest.Fields = []string{"Time"}
	searchResults, err := index.Search(searchRequest)
	if err != nil {
		return nil, err
	}

	results := make(map[uint]time.Time)
	for _, hit := range searchResults.Hits {
		if hit.Score < 0.5 {
			continue
		}
		id, err := strconv.ParseUint(hit.ID, 10, 32)
		if err != nil {
			continue
		}
		t, err := time.Parse(time.RFC3339Nano, hit.Fields["Time"].(string))
		if err != nil {
			continue
		}
		results[uint(id)] = t
	}

	return results, nil
}
