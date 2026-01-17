package aireview

import (
	"log/slog"
	"strings"
)

const adDetectionPrompt = `你是一个广告检测专家。请判断以下内容是否为广告、营销推广或垃圾信息。

判断标准：
1. 包含明显的商品推销、服务推广
2. 包含购买链接、联系方式（电话、微信、QQ等）
3. 包含诱导点击的营销话术
4. 包含重复的推广性质内容
5. 包含赌博、金融诈骗等违规内容

请仅回答"是"或"否"，不要有其他内容。

待检测内容：
%s`

// IsAd checks if the content is an advertisement using OpenAI API
func IsAd(content string) bool {
	// If content is too short, it's unlikely to be an ad
	if len(content) < 10 {
		return false
	}

	// Quick check for common ad patterns
	if containsCommonAdPatterns(content) {
		slog.Info("Content detected as ad by pattern matching", "content", content)
		return true
	}

	// Use OpenAI for more sophisticated detection
	prompt := strings.Replace(adDetectionPrompt, "%s", content, 1)
	response := Chat(prompt)

	if response == "" {
		// If OpenAI is not available or fails, default to false to avoid false positives
		return false
	}

	// Parse the response
	response = strings.TrimSpace(response)
	response = strings.ToLower(response)

	// Check if the response indicates it's an ad
	isAd := strings.Contains(response, "是") ||
		strings.Contains(response, "yes") ||
		strings.Contains(response, "true")

	if isAd {
		slog.Info("Content detected as ad by AI", "content", content)
	}

	return isAd
}

// containsCommonAdPatterns checks for common advertisement patterns
func containsCommonAdPatterns(content string) bool {
	lowerContent := strings.ToLower(content)

	// Common ad keywords
	adKeywords := []string{
		"加微信", "加qq", "联系电话", "咨询热线",
		"优惠价", "限时优惠", "特价", "打折",
		"点击购买", "立即下单", "马上抢购",
		"官方网站", "官网", "淘宝", "拼多多",
		"代理", "加盟", "招商", "赚钱",
		"贷款", "信用卡", "博彩", "赌",
	}

	for _, keyword := range adKeywords {
		if strings.Contains(lowerContent, keyword) {
			return true
		}
	}

	// Check for phone numbers (simple pattern)
	if strings.Contains(lowerContent, "1") &&
		(strings.Count(content, "1") > 3 ||
			strings.Count(content, "2") > 3 ||
			strings.Count(content, "3") > 3) {
		// Might contain phone numbers
		for i := 0; i < len(content)-10; i++ {
			digitCount := 0
			for j := i; j < len(content) && j < i+15; j++ {
				if content[j] >= '0' && content[j] <= '9' {
					digitCount++
				}
			}
			if digitCount >= 11 {
				return true
			}
		}
	}

	return false
}
