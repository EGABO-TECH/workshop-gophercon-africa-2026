package components

import (
	"cmp"
	"slices"
	"strings"

	"workshop/internal/domain/sighting"
)

type (
	// CountryStats holds aggregated wildlife telemetry for a single country.
	CountryStats struct {
		Code        string         `json:"code"`
		Name        string         `json:"name"`
		Sightings   int            `json:"sightings"`
		Species     int            `json:"species"`
		Photos      int            `json:"photos"`
		TopWildlife []SpeciesTally `json:"topWildlife"`
	}

	SpeciesTally struct {
		Name     string `json:"name"`
		Count    int    `json:"count"`
		PhotoURL string `json:"photoUrl,omitempty"`
	}

	// ComparePayload holds precomputed telemetry for client-side instant reactivity.
	ComparePayload struct {
		Countries     map[string]CountryStats `json:"countries"`
		DefaultA      string                  `json:"defaultA"`
		DefaultB      string                  `json:"defaultB"`
		CountryCodes  []string                `json:"countryCodes"`
		CountryNames  map[string]string       `json:"countryNames"`
		SharedSpecies []SharedSpeciesItem     `json:"sharedSpecies"`
	}

	SharedSpeciesItem struct {
		Name   string `json:"name"`
		CountA int    `json:"countA"`
		CountB int    `json:"countB"`
	}
)

// BuildComparePayload aggregates sightings across all countries for fast head-to-head comparison.
func BuildComparePayload(sightings []sighting.Sighting) ComparePayload {
	byCountry := make(map[string][]sighting.Sighting)
	countryNames := make(map[string]string)
	photoMap := make(map[string]string) // speciesName -> photoUrl

	for _, s := range sightings {
		c := strings.ToUpper(strings.TrimSpace(string(s.Location.CountryCode)))
		if c == "" {
			c = countryCodeFromName(s.Location.Country)
		}
		if c == "" {
			continue
		}
		byCountry[c] = append(byCountry[c], s)
		if s.Location.Country != "" && countryNames[c] == "" {
			countryNames[c] = s.Location.Country
		}
		spName := displayName(s.Species)
		if photoMap[spName] == "" {
			for _, m := range s.Media {
				if m.Type == "StillImage" && m.URL != "" {
					photoMap[spName] = m.URL
					break
				}
			}
		}
	}

	statsMap := make(map[string]CountryStats)
	for c, list := range byCountry {
		name := countryNames[c]
		if name == "" {
			name = c
		}
		speciesCounts := make(map[string]int)
		photos := 0
		for _, s := range list {
			spName := displayName(s.Species)
			speciesCounts[spName]++
			for _, m := range s.Media {
				if m.Type == "StillImage" {
					photos++
				}
			}
		}

		tallies := make([]SpeciesTally, 0, len(speciesCounts))
		for sp, cnt := range speciesCounts {
			tallies = append(tallies, SpeciesTally{
				Name:     sp,
				Count:    cnt,
				PhotoURL: photoMap[sp],
			})
		}
		slices.SortFunc(tallies, func(a, b SpeciesTally) int {
			return cmp.Compare(b.Count, a.Count)
		})
		if len(tallies) > 8 {
			tallies = tallies[:8]
		}

		statsMap[c] = CountryStats{
			Code:        c,
			Name:        name,
			Sightings:   len(list),
			Species:     len(speciesCounts),
			Photos:      photos,
			TopWildlife: tallies,
		}
	}

	// Determine country codes sorted by sightings count descending
	codes := make([]string, 0, len(statsMap))
	for c := range statsMap {
		codes = append(codes, c)
	}
	slices.SortFunc(codes, func(a, b string) int {
		return cmp.Compare(statsMap[b].Sightings, statsMap[a].Sightings)
	})

	defA := "KE"
	defB := "ZA"
	if len(codes) >= 2 {
		if _, ok := statsMap["KE"]; !ok {
			defA = codes[0]
		}
		if _, ok := statsMap["ZA"]; !ok {
			defB = codes[1]
			if defB == defA && len(codes) > 2 {
				defB = codes[2]
			}
		}
	}

	return ComparePayload{
		Countries:    statsMap,
		DefaultA:     defA,
		DefaultB:     defB,
		CountryCodes: codes,
		CountryNames: countryNames,
	}
}

func countryCodeFromName(name string) string {
	n := strings.ToLower(strings.TrimSpace(name))
	switch {
	case strings.Contains(n, "kenya"):
		return "KE"
	case strings.Contains(n, "south africa"):
		return "ZA"
	case strings.Contains(n, "tanzania"):
		return "TZ"
	case strings.Contains(n, "botswana"):
		return "BW"
	case strings.Contains(n, "uganda"):
		return "UG"
	case strings.Contains(n, "rwanda"):
		return "RW"
	case strings.Contains(n, "namibia"):
		return "NA"
	case strings.Contains(n, "zambia"):
		return "ZM"
	case strings.Contains(n, "zimbabwe"):
		return "ZW"
	case strings.Contains(n, "madagascar"):
		return "MG"
	case strings.Contains(n, "mozambique"):
		return "MZ"
	case strings.Contains(n, "malawi"):
		return "MW"
	case strings.Contains(n, "egypt"):
		return "EG"
	default:
		return ""
	}
}
