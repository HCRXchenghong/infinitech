import SwiftUI
import CoreLocation
import UIKit

#if canImport(MapLibre)
import MapLibre
#endif

struct OSMMapView: UIViewRepresentable {
    let center: CLLocationCoordinate2D

    func makeUIView(context: Context) -> UIView {
        #if canImport(MapLibre)
        // MapLibre is optional during bootstrap stage. Replace UIView by real map view after SDK wiring.
        let view = UIView(frame: .zero)
        view.backgroundColor = UIColor.systemGroupedBackground
        return view
        #else
        let view = UIView(frame: .zero)
        view.backgroundColor = UIColor.systemGroupedBackground
        return view
        #endif
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        _ = center
    }
}
