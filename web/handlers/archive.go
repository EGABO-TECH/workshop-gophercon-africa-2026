package handlers

import (
	"log/slog"
	"net/http"
	"workshop/internal/domain/sighting"
	"workshop/web/views/pages"

	"github.com/a-h/templ"
)

func Photos(logger *slog.Logger, sightings SightingsLister) http.HandlerFunc {
	return archivePage(logger, sightings, pages.Photos)
}

func Records(logger *slog.Logger, sightings SightingsLister) http.HandlerFunc {
	return archivePage(logger, sightings, pages.Records)
}

func Map(logger *slog.Logger, sightings SightingsLister) http.HandlerFunc {
	return archivePage(logger, sightings, pages.Map)
}

func Trends(logger *slog.Logger, sightings SightingsLister) http.HandlerFunc {
	return archivePage(logger, sightings, pages.Trends)
}

func archivePage(logger *slog.Logger, sightings SightingsLister, render func([]sighting.Sighting) templ.Component) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		items, err := sightings.List(ctx, sighting.ListFilter{})
		if err != nil {
			logger.ErrorContext(ctx, "handlers: listing sightings: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to load sightings.")
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err = render(items).Render(ctx, w); err != nil {
			logger.ErrorContext(ctx, "handlers: rendering archive page: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to render page.")
		}
	}
}
