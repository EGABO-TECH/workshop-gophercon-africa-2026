package handlers_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"workshop/internal/common/logs"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/species"
	"workshop/web/handlers"

	"github.com/stretchr/testify/assert"
)

func TestHome(t *testing.T) {
	t.Parallel()

	t.Run("OK", func(t *testing.T) {
		t.Parallel()

		var gotFilter sighting.ListFilter
		got := serveHome(t, fakeLister{filter: &gotFilter, items: []sighting.Sighting{
			{GBIFKey: 1, Species: species.Species{VernacularName: "lion"}},
		}})
		assert.Equal(t, http.StatusOK, got.Code)
		assert.Equal(t, "text/html; charset=utf-8", got.Header().Get("Content-Type"))
		assert.Zero(t, gotFilter.Limit)

		body := got.Body.String()
		lastSection := -1
		for _, section := range []string{
			`id="highlights"`,
			`id="sightings"`,
			`id="map-section"`,
			`id="analytics"`,
		} {
			position := strings.Index(body, section)
			assert.Greater(t, position, lastSection, "expected homepage section %s in editorial order", section)
			lastSection = position
		}
	})

	t.Run("No sightings", func(t *testing.T) {
		t.Parallel()

		got := serveHome(t, fakeLister{})
		assert.Equal(t, http.StatusOK, got.Code)
		assert.Contains(t, got.Body.String(), "id=\"analytics\"")
		assert.Contains(t, got.Body.String(), "Record trends will appear when observations are available.")
		assert.NotContains(t, got.Body.String(), "0001")
	})

	t.Run("List error", func(t *testing.T) {
		t.Parallel()

		got := serveHome(t, fakeLister{err: errors.New("store unavailable")})
		assert.Equal(t, http.StatusInternalServerError, got.Code)
		assert.Equal(t, "text/html; charset=utf-8", got.Header().Get("Content-Type"))
	})
}

type fakeLister struct {
	items  []sighting.Sighting
	err    error
	filter *sighting.ListFilter
}

func (f fakeLister) List(_ context.Context, filter sighting.ListFilter) ([]sighting.Sighting, error) {
	if f.filter != nil {
		*f.filter = filter
	}
	return f.items, f.err
}

func serveHome(t *testing.T, lister handlers.SightingsLister) *httptest.ResponseRecorder {
	t.Helper()

	logger := logs.NewProduction(io.Discard, slog.LevelError)
	rec := httptest.NewRecorder()
	handlers.Home(logger, lister)(rec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil))

	return rec
}
