package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
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
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.setApp(wailsApp)

	wailsApp.Window.NewWithOptions(application.WebviewWindowOptions{
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

	if err := wailsApp.Run(); err != nil {
		log.Fatal(err)
	}
}
