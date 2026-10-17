package pages

import (
	"cmp"
	"workshop/internal/domain/sighting"
)

// withPhotos returns the first n sightings that carry at least one StillImage.
func withPhotos(sightings []sighting.Sighting, n int) []sighting.Sighting {
	out := make([]sighting.Sighting, 0, n)
	for _, s := range sightings {
		for _, m := range s.Media {
			if m.Type == "StillImage" {
				out = append(out, s)
				break
			}
		}
		if len(out) == n {
			break
		}
	}
	return out
}

// topSpecies ranks species by total sightings.
func topSpecies(sightings []sighting.Sighting, n int) []sighting.Tally {
	return sighting.Top(sighting.CountBy(sightings, func(s sighting.Sighting) string {
		return cmp.Or(s.Species.VernacularName, s.Species.CanonicalName, s.Species.ScientificName)
	}), n)
}

// topCountries ranks countries with the most sightings.
func topCountries(sightings []sighting.Sighting, n int) []sighting.Tally {
	return sighting.Top(sighting.CountBy(sightings, func(s sighting.Sighting) string {
		return s.Location.Country
	}), n)
}
