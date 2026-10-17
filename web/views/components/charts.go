package components

import (
	"fmt"
	"strconv"
	"strings"

	"workshop/internal/domain/sighting"
)

// The sparkline's drawing box, matching the viewBox in the templ.
const sparkW, sparkH = 100.0, 24.0

// years lists every year from the first sighting to the last, so a quiet year stays a dip.
func years(sum sighting.Summary) []int {
	if sum.Earliest.IsZero() || sum.Latest.IsZero() || sum.Latest.Year() < sum.Earliest.Year() {
		return nil
	}
	ys := make([]int, 0, sum.Latest.Year()-sum.Earliest.Year()+1)
	for y := sum.Earliest.Year(); y <= sum.Latest.Year(); y++ {
		ys = append(ys, y)
	}
	return ys
}

// peak finds the busiest year and its count.
func peak(byYear map[int]int) (year, count int) {
	for y, n := range byYear {
		if n > count || (n == count && y < year) {
			year, count = y, n
		}
	}
	return year, count
}

// sparkPoints plots a count per year across the box, the busiest year at the top.
func sparkPoints(byYear map[int]int, sum sighting.Summary) string {
	ys := years(sum)
	if len(ys) == 0 {
		return ""
	}
	_, high := peak(byYear)
	var b strings.Builder
	for i, y := range ys {
		x := 0.0
		if len(ys) > 1 {
			x = float64(i) / float64(len(ys)-1) * sparkW
		}
		top := sparkH
		if high > 0 {
			top = sparkH - float64(byYear[y])/float64(high)*(sparkH-1)
		}
		fmt.Fprintf(&b, "%.1f,%.1f ", x, top)
	}
	return strings.TrimSpace(b.String())
}

// sparkArea closes the line down to the baseline, for the fill under it.
func sparkArea(byYear map[int]int, sum sighting.Summary) string {
	pts := sparkPoints(byYear, sum)
	if pts == "" {
		return ""
	}
	return fmt.Sprintf("0,%v %s %v,%v", sparkH, pts, sparkW, sparkH)
}

// sparkLabel says in words what the line shows.
func sparkLabel(byYear map[int]int, sum sighting.Summary) string {
	y, n := peak(byYear)
	return fmt.Sprintf("Sightings per year, %d to %d, most in %d with %d",
		sum.Earliest.Year(), sum.Latest.Year(), y, n)
}

// bar sets --bar to a row's share of the longest, for charts.css to draw.
func bar(count, longest int) map[string]string {
	if longest <= 0 {
		return map[string]string{"--bar": "0%"}
	}
	return map[string]string{"--bar": strconv.Itoa(count*100/longest) + "%"}
}
