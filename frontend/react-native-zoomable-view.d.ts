// frontend/src/@types/react-native-zoomable-view.d.ts

declare module '@dudigital/react-native-zoomable-view' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface ZoomableViewProps extends ViewProps {
    zoomEnabled?: boolean;
    maxZoom?: number;
    minZoom?: number;
    zoomStep?: number;
    initialZoom?: number;
    bindToBorders?: boolean;
  }

  const ZoomableView: ComponentType<ZoomableViewProps>;
  export default ZoomableView;
}
