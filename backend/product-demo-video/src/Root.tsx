import React from 'react';
import {Composition, Folder, Still} from 'remotion';
import {
  DURATION_IN_FRAMES,
  FPS,
  HEIGHT,
  WIDTH,
  type DemoProps,
} from './demoData';
import {ProductDemoThumbnail, ScanMySocialDemo} from './ScanMySocialDemo';

export const Root: React.FC = () => {
  const defaultProps = {
    includeVoiceover: true,
    voiceoverPath: 'audio/voiceover.mp3',
    includeMusic: true,
    musicPath: 'audio/music-bed.wav',
  } satisfies DemoProps;

  return (
    <Folder name="Marketing">
      <Composition
        id="ScanMySocialDemo"
        component={ScanMySocialDemo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultProps}
      />
      <Still
        id="ScanMySocialThumbnail"
        component={ProductDemoThumbnail}
        width={WIDTH}
        height={HEIGHT}
      />
    </Folder>
  );
};
