package search

import (
	"errors"
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

func AddResourceToIndex(r model.Resource) error {
	return index.Index(fmt.Sprintf("%d", r.ID), ResourceParams{
		Id:        r.ID,
		Title:     r.Title,
		Subtitles: r.AlternativeTitles,
		Time:      r.CreatedAt,
	})
}

func RemoveResourceFromIndex(id uint) error {
	return index.Delete(fmt.Sprintf("%d", id))
}

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
			err := AddResourceToIndex(r)
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
	indexPath := utils.GetStoragePath() + "/resource_index.bleve"

	var err error
	index, err = bleve.Open(indexPath)
	if errors.Is(err, bleve.ErrorIndexPathDoesNotExist) {
		mapping := bleve.NewIndexMapping()
		index, err = bleve.New(indexPath, mapping)
		if err != nil {
			panic("Failed to create search index: " + err.Error())
		}
		go func() {
			err := createIndex()
			if err != nil {
				panic("Failed to create search index: " + err.Error())
			}
		}()
	} else if err != nil {
		panic("Failed to open search index: " + err.Error())
	}
}

func SearchResource(keyword string) ([]uint, error) {
	query := bleve.NewMatchQuery(keyword)
	searchRequest := bleve.NewSearchRequest(query)
	searchResults, err := index.Search(searchRequest)
	if err != nil {
		return nil, err
	}

	results := make([]uint, 0)
	for _, hit := range searchResults.Hits {
		if hit.Score < 0.2 {
			break
		}
		id, err := strconv.ParseUint(hit.ID, 10, 32)
		if err != nil {
			continue
		}
		results = append(results, uint(id))
	}

	return results, nil
}

func IsStopWord(word string) bool {
	mapping := bleve.NewIndexMapping()
	analyzerName := mapping.DefaultAnalyzer
	analyzer := mapping.AnalyzerNamed(analyzerName)
	if analyzer == nil {
		return false
	}
	tokens := analyzer.Analyze([]byte(word))
	return len(tokens) == 0
}
