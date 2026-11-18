package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	wailsApp := application.New(application.Options{
		Name:        "Mail Probe",
		Description: "SMTP Diagnostics Tool",
		Services: []application.Service{
			application.NewService(app),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
	})
	app.setApp(wailsApp)

	win := wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:           "Mail Probe",
		Width:           1100,
		Height:          720,
		MinWidth:        820,
		MinHeight:       500,
		InitialPosition: application.WindowCentered,
		Mac: application.MacWindow{
			TitleBar:   application.MacTitleBarDefault,
			Backdrop:   application.MacBackdropNormal,
			Appearance: application.NSAppearanceNameAqua,
		},
		BackgroundColour: application.NewRGB(245, 245, 245),
		URL:              "/",
	})

	// Clicking the red close button hides the window; app stays in the Dock.
	win.RegisterHook(events.Mac.WindowShouldClose, func(e *application.WindowEvent) {
		e.Cancel()
		win.Hide()
	})

	// Clicking the Dock icon brings the window back.
	wailsApp.Event.OnApplicationEvent(events.Mac.ApplicationShouldHandleReopen, func(e *application.ApplicationEvent) {
		win.Show()
		win.Focus()
	})

	if err := wailsApp.Run(); err != nil {
		log.Fatal(err)
	}
}
