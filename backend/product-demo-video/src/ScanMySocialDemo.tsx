import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  FPS,
  VIDEO_SECONDS,
  sampleVideos,
  scenes,
  scriptLines,
  type DemoProps,
} from './demoData';
import {
  realAppScreenshots,
  type ScreenshotKey,
} from './generated/screenshots';

const colors = {
  ink: '#141022',
  muted: '#6F6785',
  mist: '#F7F4FF',
  surface: '#FFFFFF',
  violet: '#7C3AED',
  violetDark: '#4C1D95',
  rose: '#F43F5E',
  roseSoft: '#FFE4E9',
  teal: '#10B981',
  amber: '#F59E0B',
  slate: '#E7E2F3',
};

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const crispEase = Easing.bezier(0.16, 1, 0.3, 1);
const editorialEase = Easing.bezier(0.45, 0, 0.55, 1);
const emphasisEase = Easing.bezier(0.22, 1, 0.36, 1);

const easeClamp = {
  ...clamp,
  easing: crispEase,
};

const editorialClamp = {
  ...clamp,
  easing: editorialEase,
};

const fadeForScene = (frame: number, duration: number): number => {
  const enter = interpolate(frame, [0, 18], [0, 1], easeClamp);
  const exit = interpolate(frame, [duration - 22, duration], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });

  return Math.min(enter, exit);
};

const sceneProgress = (frame: number, duration: number): number =>
  interpolate(frame, [0, duration], [0, 1], editorialClamp);

const pct = (value: number): string => `${value}%`;

const Container: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill
    style={{
      background:
        'linear-gradient(135deg, #F7F4FF 0%, #FFFFFF 46%, #FFF1F4 100%)',
      color: colors.ink,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}
  >
    {children}
  </AbsoluteFill>
);

const AnimatedGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const offset = frame * 0.22;

  return (
    <AbsoluteFill
      style={{
        opacity: 0.5,
        backgroundImage:
          'linear-gradient(rgba(124,58,237,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.08) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        transform: `translate3d(${-offset % 64}px, ${offset % 64}px, 0)`,
      }}
    />
  );
};

const BrandMark: React.FC<{large?: boolean; light?: boolean}> = ({
  large = false,
  light = false,
}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: large ? 24 : 14}}>
    <Img
      src={staticFile('assets/logo.webp')}
      style={{
        width: large ? 116 : 54,
        height: large ? 116 : 54,
        borderRadius: large ? 30 : 16,
        objectFit: 'cover',
        boxShadow: '0 22px 50px rgba(124,58,237,0.24)',
      }}
    />
    {light ? (
      <span
        style={{
          color: '#FFFFFF',
          fontSize: large ? 42 : 24,
          fontWeight: 950,
          letterSpacing: 0,
        }}
      >
        Scan My Social
      </span>
    ) : (
      <Img
        src={staticFile('assets/ScanMySocial.avif')}
        style={{
          height: large ? 54 : 26,
          width: large ? 390 : 190,
          objectFit: 'contain',
          filter: 'brightness(0)',
        }}
      />
    )}
  </div>
);

const Kicker: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      borderRadius: 999,
      border: '1px solid rgba(124,58,237,0.2)',
      background: 'rgba(255,255,255,0.82)',
      color: colors.violet,
      padding: '12px 18px',
      fontSize: 22,
      fontWeight: 900,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      boxShadow: '0 18px 50px rgba(76,29,149,0.08)',
    }}
  >
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: colors.rose,
      }}
    />
    {children}
  </div>
);

const SceneTitle: React.FC<{
  eyebrow: string;
  title: string;
  maxWidth?: number;
}> = ({eyebrow, title, maxWidth = 820}) => (
  <div style={{maxWidth}}>
    <Kicker>{eyebrow}</Kicker>
    <h1
      style={{
        margin: '28px 0 0',
        fontSize: 76,
        lineHeight: 0.96,
        letterSpacing: 0,
        fontWeight: 950,
      }}
    >
      {title}
    </h1>
  </div>
);

const MacWindow: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
  title?: string;
  screenshotKey?: ScreenshotKey;
  style?: React.CSSProperties;
}> = ({
  children,
  width = 920,
  height = 620,
  title = 'Dashboard',
  screenshotKey,
  style,
}) => {
  const screenshot = screenshotKey
    ? realAppScreenshots.images[screenshotKey]
    : null;
  const hasScreenshot = Boolean(screenshot?.captured);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 26,
        overflow: 'hidden',
        border: '1px solid rgba(20,16,34,0.08)',
        background: colors.surface,
        boxShadow: '0 38px 110px rgba(20,16,34,0.18)',
        ...style,
      }}
    >
      <div
        style={{
          height: 58,
          borderBottom: '1px solid rgba(20,16,34,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 22px',
          background: 'rgba(247,244,255,0.7)',
        }}
      >
        {[colors.rose, colors.amber, colors.teal].map((color) => (
          <span
            key={color}
            style={{width: 14, height: 14, borderRadius: 999, background: color}}
          />
        ))}
        <span
          style={{
            marginLeft: 18,
            color: colors.muted,
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {title}
        </span>
        {hasScreenshot ? (
          <span
            style={{
              marginLeft: 'auto',
              borderRadius: 999,
              background: '#ECFDF5',
              color: '#047857',
              padding: '7px 11px',
              fontSize: 13,
              fontWeight: 950,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            Real app capture
          </span>
        ) : null}
      </div>
      {hasScreenshot && screenshot ? (
        <div
          style={{
            position: 'relative',
            height: height - 58,
            background: '#F8FAFC',
          }}
        >
          <Img
            src={staticFile(screenshot.path)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top left',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 0 1px rgba(20,16,34,0.05)',
            }}
          />
        </div>
      ) : (
        children
      )}
    </div>
  );
};

const Sidebar: React.FC = () => (
  <div
    style={{
      width: 172,
      height: '100%',
      borderRight: '1px solid rgba(20,16,34,0.08)',
      background: '#FBFAFF',
      padding: 20,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        background: colors.violet,
        marginBottom: 32,
      }}
    />
    {['Home', 'Channels', 'Videos', 'Projects', 'Scripts', 'Auto DM'].map(
      (item, index) => (
        <div
          key={item}
          style={{
            height: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderRadius: 12,
            padding: '0 12px',
            marginBottom: 10,
            color: index === 2 ? '#FFFFFF' : colors.muted,
            background: index === 2 ? colors.violet : 'transparent',
            fontSize: 15,
            fontWeight: 850,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: index === 2 ? '#FFFFFF' : colors.slate,
            }}
          />
          {item}
        </div>
      ),
    )}
  </div>
);

const MetricCard: React.FC<{
  label: string;
  value: string;
  color: string;
  delay?: number;
}> = ({label, value, color, delay = 0}) => {
  const frame = useCurrentFrame();
  const lift = interpolate(frame - delay, [0, 24], [28, 0], easeClamp);
  const opacity = interpolate(frame - delay, [0, 18], [0, 1], easeClamp);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 118,
        borderRadius: 22,
        padding: 24,
        background: '#FFFFFF',
        border: '1px solid rgba(20,16,34,0.08)',
        boxShadow: '0 18px 50px rgba(20,16,34,0.08)',
        opacity,
        transform: `translateY(${lift}px)`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 5,
          borderRadius: 999,
          background: color,
          marginBottom: 18,
        }}
      />
      <div style={{fontSize: 19, color: colors.muted, fontWeight: 800}}>
        {label}
      </div>
      <div style={{fontSize: 38, fontWeight: 950, marginTop: 8}}>{value}</div>
    </div>
  );
};

const CaptionBar: React.FC = () => {
  const frame = useCurrentFrame();
  const currentScene =
    [...scenes]
      .reverse()
      .find((scene) => frame >= scene.start) ?? scenes[0];
  const localFrame = frame - currentScene.start;
  const opacity = fadeForScene(localFrame, currentScene.duration);

  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        right: 96,
        bottom: 52,
        height: 92,
        borderRadius: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '0 34px',
        background: 'rgba(20,16,34,0.86)',
        color: '#FFFFFF',
        boxShadow: '0 24px 80px rgba(20,16,34,0.28)',
        opacity,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          background: colors.rose,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 950,
        }}
      >
        {scenes.findIndex((scene) => scene.id === currentScene.id) + 1}
      </div>
      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 950,
            letterSpacing: 2,
            color: '#C7BDFB',
            textTransform: 'uppercase',
            marginBottom: 5,
          }}
        >
          {currentScene.eyebrow}
        </div>
        <div style={{fontSize: 25, lineHeight: 1.18, fontWeight: 780}}>
          {currentScene.caption}
        </div>
      </div>
    </div>
  );
};

const Radar: React.FC<{progress: number}> = ({progress}) => {
  const sweep = progress * 360;

  return (
    <div
      style={{
        position: 'absolute',
        width: 640,
        height: 640,
        borderRadius: 999,
        right: 160,
        top: 210,
        background:
          'radial-gradient(circle, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.04) 38%, transparent 69%)',
        border: '1px solid rgba(124,58,237,0.16)',
      }}
    >
      {[26, 44, 62, 80].map((size) => (
        <div
          key={size}
          style={{
            position: 'absolute',
            inset: pct((100 - size) / 2),
            borderRadius: 999,
            border: '1px solid rgba(124,58,237,0.14)',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          background:
            'conic-gradient(from 0deg, rgba(244,63,94,0.0), rgba(244,63,94,0.42), rgba(244,63,94,0.0) 20%)',
          transform: `rotate(${sweep}deg)`,
          mixBlendMode: 'multiply',
        }}
      />
      {[
        [26, 33, colors.rose],
        [62, 28, colors.violet],
        [43, 64, colors.teal],
        [72, 60, colors.amber],
      ].map(([left, top, color], index) => (
        <div
          key={`${left}-${top}`}
          style={{
            position: 'absolute',
            left: pct(Number(left)),
            top: pct(Number(top)),
            width: 24,
            height: 24,
            borderRadius: 999,
            background: String(color),
            boxShadow: `0 0 0 ${10 + Math.sin(progress * 8 + index) * 6}px rgba(124,58,237,0.09)`,
          }}
        />
      ))}
    </div>
  );
};

const ColdOpenScene: React.FC<{localFrame: number; duration: number}> = ({
  localFrame,
  duration,
}) => {
  const opacity = fadeForScene(localFrame, duration);
  const progress = sceneProgress(localFrame, duration);
  const titleY = interpolate(localFrame, [0, 34], [50, 0], easeClamp);

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 116, top: 184}}>
        <SceneTitle
          eyebrow="Problem"
          title="Stop guessing what will work"
          maxWidth={760}
        />
        <p
          style={{
            marginTop: 32,
            fontSize: 32,
            lineHeight: 1.22,
            fontWeight: 700,
            color: colors.muted,
            maxWidth: 680,
            transform: `translateY(${titleY}px)`,
            opacity: interpolate(localFrame, [10, 42], [0, 1], easeClamp),
          }}
        >
          The signal is already inside your niche. You just need a system that
          finds it before your content calendar goes cold.
        </p>
      </div>
      <Radar progress={progress} />
      {sampleVideos.slice(0, 3).map((video, index) => {
        const cardFrame = localFrame - 18 - index * 12;
        const cardOpacity = interpolate(cardFrame, [0, 20], [0, 1], easeClamp);
        const cardX = interpolate(cardFrame, [0, 32], [90, 0], easeClamp);

        return (
          <div
            key={video.creator}
            style={{
              position: 'absolute',
              right: 254 - index * 64,
              top: 300 + index * 148,
              width: 480,
              minHeight: 118,
              borderRadius: 26,
              padding: 22,
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(20,16,34,0.08)',
              boxShadow: '0 24px 70px rgba(20,16,34,0.14)',
              opacity: cardOpacity,
              transform: `translateX(${cardX}px)`,
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 20,
                  background: video.color,
                }}
              />
              <div>
                <div
                  style={{fontSize: 17, color: colors.muted, fontWeight: 850}}
                >
                  {video.creator}
                </div>
                <div style={{fontSize: 23, fontWeight: 930, marginTop: 4}}>
                  {video.title}
                </div>
              </div>
              <div style={{marginLeft: 'auto', textAlign: 'right'}}>
                <div style={{fontSize: 30, color: video.color, fontWeight: 950}}>
                  {video.score}
                </div>
                <div style={{fontSize: 13, color: colors.muted, fontWeight: 900}}>
                  outlier
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const ProductRevealScene: React.FC<{localFrame: number; duration: number}> = ({
  localFrame,
  duration,
}) => {
  const opacity = fadeForScene(localFrame, duration);
  const scale = interpolate(localFrame, [0, 42], [0.94, 1], easeClamp);
  const productScreenshotKey: ScreenshotKey | null = realAppScreenshots.images
    .dashboard.captured
    ? 'dashboard'
    : realAppScreenshots.images.welcome.captured
      ? 'welcome'
      : null;
  const productScreenshotTitle =
    productScreenshotKey === 'dashboard' ? 'Dashboard' : 'Scan My Social';

  return (
    <AbsoluteFill style={{opacity}}>
      <div
        style={{
          position: 'absolute',
          inset: 96,
          borderRadius: 48,
          background: 'rgba(255,255,255,0.76)',
          border: '1px solid rgba(124,58,237,0.14)',
          boxShadow: '0 40px 120px rgba(76,29,149,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 110px',
          transform: `scale(${scale})`,
        }}
      >
        <div>
          <BrandMark large />
          <h2
            style={{
              fontSize: 86,
              lineHeight: 0.98,
              letterSpacing: 0,
              fontWeight: 960,
              maxWidth: 760,
              margin: '62px 0 0',
            }}
          >
            Content research, creation, and conversion in one flow.
          </h2>
        </div>
        {productScreenshotKey ? (
          <MacWindow
            title={productScreenshotTitle}
            screenshotKey={productScreenshotKey}
            width={720}
            height={600}
            style={{
              transform: 'rotate(1.5deg)',
              boxShadow: '0 44px 120px rgba(20,16,34,0.24)',
            }}
          >
            <div />
          </MacWindow>
        ) : (
          <div
            style={{
              width: 560,
              height: 680,
              borderRadius: 44,
              background: colors.ink,
              padding: 26,
              color: '#FFFFFF',
              boxShadow: '0 38px 110px rgba(20,16,34,0.25)',
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{fontSize: 18, fontWeight: 900, color: '#C7BDFB'}}>
                Today
              </span>
              <span style={{fontSize: 18, fontWeight: 900, color: '#FCA5B5'}}>
                Live signals
              </span>
            </div>
            <div style={{marginTop: 52}}>
              {[
                ['Channels scanned', '48'],
                ['Outlier videos found', '126'],
                ['Scripts generated', '32'],
                ['Leads captured', '418'],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: 24,
                    padding: '24px 26px',
                    background:
                      index % 2 === 0
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(124,58,237,0.22)',
                    marginBottom: 18,
                  }}
                >
                  <span style={{fontSize: 24, fontWeight: 780}}>{label}</span>
                  <span style={{fontSize: 48, fontWeight: 950}}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const ChannelsScene: React.FC<{localFrame: number; duration: number}> = ({
  localFrame,
  duration,
}) => {
  const opacity = fadeForScene(localFrame, duration);

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 104, top: 118}}>
        <SceneTitle
          eyebrow="Step 1"
          title="Add the accounts you want to learn from"
          maxWidth={780}
        />
      </div>
      <MacWindow
        title="Channels"
        screenshotKey="channels"
        width={1050}
        height={690}
        style={{position: 'absolute', right: 96, top: 188}}
      >
        <div style={{display: 'flex', height: 'calc(100% - 58px)'}}>
          <Sidebar />
          <div style={{flex: 1, padding: 34}}>
            <div
              style={{
                height: 78,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{fontSize: 30, fontWeight: 950}}>Channels</div>
                <div style={{fontSize: 18, color: colors.muted, fontWeight: 700}}>
                  Discover and track top accounts in your niche
                </div>
              </div>
              <div
                style={{
                  borderRadius: 14,
                  background: colors.violet,
                  color: '#FFFFFF',
                  padding: '14px 20px',
                  fontSize: 16,
                  fontWeight: 950,
                }}
              >
                Add channel
              </div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
              {[
                ['Fitness Creators', '12 accounts', colors.rose],
                ['B2B Growth', '9 accounts', colors.violet],
                ['Founder Clips', '7 accounts', colors.teal],
                ['Agency Ads', '11 accounts', colors.amber],
              ].map(([title, count, color], index) => {
                const local = localFrame - index * 8;
                const y = interpolate(local, [0, 25], [34, 0], easeClamp);
                const cardOpacity = interpolate(local, [0, 24], [0, 1], easeClamp);

                return (
                  <div
                    key={title}
                    style={{
                      minHeight: 154,
                      borderRadius: 24,
                      border: '1px solid rgba(20,16,34,0.08)',
                      background: '#FFFFFF',
                      padding: 24,
                      opacity: cardOpacity,
                      transform: `translateY(${y}px)`,
                      boxShadow: '0 18px 50px rgba(20,16,34,0.07)',
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 18,
                        background: String(color),
                        marginBottom: 18,
                      }}
                    />
                    <div style={{fontSize: 24, fontWeight: 940}}>{title}</div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 18,
                        color: colors.muted,
                        fontWeight: 800,
                      }}
                    >
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </MacWindow>
    </AbsoluteFill>
  );
};

const OutlierCard: React.FC<{
  video: (typeof sampleVideos)[number];
  index: number;
}> = ({video, index}) => {
  const frame = useCurrentFrame();
  const delay = index * 8;
  const y = interpolate(frame - delay, [0, 30], [40, 0], easeClamp);
  const opacity = interpolate(frame - delay, [0, 24], [0, 1], easeClamp);

  return (
    <div
      style={{
        minHeight: 194,
        borderRadius: 26,
        background: '#FFFFFF',
        border: '1px solid rgba(20,16,34,0.08)',
        padding: 22,
        boxShadow: '0 20px 60px rgba(20,16,34,0.09)',
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          height: 74,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${video.color}, #141022)`,
          marginBottom: 18,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: 18,
            top: 18,
            color: '#FFFFFF',
            fontSize: 19,
            fontWeight: 950,
          }}
        >
          {video.views}
        </div>
      </div>
      <div style={{fontSize: 16, color: colors.muted, fontWeight: 850}}>
        {video.creator}
      </div>
      <div style={{fontSize: 22, lineHeight: 1.1, fontWeight: 940, marginTop: 5}}>
        {video.title}
      </div>
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{fontSize: 15, color: colors.muted, fontWeight: 800}}>
          baseline {video.baseline}
        </span>
        <span
          style={{
            borderRadius: 999,
            padding: '8px 12px',
            background: `${video.color}18`,
            color: video.color,
            fontSize: 20,
            fontWeight: 950,
          }}
        >
          {video.score}
        </span>
      </div>
    </div>
  );
};

const OutliersScene: React.FC<{localFrame: number; duration: number}> = ({
  localFrame,
  duration,
}) => {
  const opacity = fadeForScene(localFrame, duration);

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 104, top: 108}}>
        <SceneTitle
          eyebrow="Step 2"
          title="Find the posts that broke the baseline"
          maxWidth={860}
        />
      </div>
      <MacWindow
        title="Videos"
        screenshotKey="videos"
        width={1110}
        height={710}
        style={{position: 'absolute', right: 86, top: 178}}
      >
        <div style={{display: 'flex', height: 'calc(100% - 58px)'}}>
          <Sidebar />
          <div style={{flex: 1, padding: 32}}>
            <div
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              {['My Watchlist', 'Outlier Score', 'Reels', 'Last 30 days'].map(
                (filter, index) => (
                  <div
                    key={filter}
                    style={{
                      borderRadius: 999,
                      padding: '12px 16px',
                      background: index === 1 ? colors.violet : '#F5F2FE',
                      color: index === 1 ? '#FFFFFF' : colors.ink,
                      fontSize: 15,
                      fontWeight: 900,
                    }}
                  >
                    {filter}
                  </div>
                ),
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 18,
              }}
            >
              {sampleVideos.map((video, index) => (
                <OutlierCard key={video.creator} video={video} index={index} />
              ))}
            </div>
          </div>
        </div>
      </MacWindow>
    </AbsoluteFill>
  );
};

const AnalysisScene: React.FC<{localFrame: number; duration: number}> = ({
  localFrame,
  duration,
}) => {
  const opacity = fadeForScene(localFrame, duration);
  const progress = sceneProgress(localFrame, duration);

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 104, top: 108}}>
        <SceneTitle
          eyebrow="Step 3"
          title="Decode the hook, story, rhythm, and CTA"
          maxWidth={840}
        />
      </div>
      <MacWindow
        title="Video Analysis"
        screenshotKey="videoDetail"
        width={1120}
        height={710}
        style={{position: 'absolute', right: 84, top: 178}}
      >
        <div style={{display: 'flex', height: 'calc(100% - 58px)'}}>
          <Sidebar />
          <div
            style={{
              flex: 1,
              padding: 30,
              display: 'grid',
              gridTemplateColumns: '330px 1fr',
              gap: 24,
            }}
          >
            <div
              style={{
                borderRadius: 28,
                background: colors.ink,
                padding: 18,
                color: '#FFFFFF',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: 430,
                  borderRadius: 22,
                  background:
                    'linear-gradient(150deg, #F43F5E 0%, #7C3AED 52%, #141022 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 40,
                  right: 40,
                  bottom: 58,
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.14)',
                  padding: 18,
                  fontSize: 22,
                  lineHeight: 1.08,
                  fontWeight: 920,
                }}
              >
                "Most creators are copying content. You should copy the
                system."
              </div>
            </div>
            <div>
              <div style={{display: 'flex', gap: 16, marginBottom: 18}}>
                <MetricCard label="Hook score" value="9.1" color={colors.rose} />
                <MetricCard
                  label="Retention"
                  value="84%"
                  color={colors.teal}
                  delay={8}
                />
                <MetricCard
                  label="CTA clarity"
                  value="8.7"
                  color={colors.amber}
                  delay={16}
                />
              </div>
              <div
                style={{
                  borderRadius: 26,
                  border: '1px solid rgba(20,16,34,0.08)',
                  background: '#FFFFFF',
                  padding: 24,
                  minHeight: 284,
                  boxShadow: '0 18px 50px rgba(20,16,34,0.07)',
                }}
              >
                {[
                  ['Hook', 'Contrarian opener creates immediate tension.'],
                  ['Story', 'Shows a visible before and after in one idea.'],
                  ['Rhythm', 'Short phrases, fast beats, no filler.'],
                  ['CTA', 'Single action: comment "vault" for the resource.'],
                ].map(([label, text], index) => {
                  const barWidth = interpolate(
                    progress,
                    [0.1 + index * 0.08, 0.44 + index * 0.08],
                    [0, 100],
                    {
                      ...clamp,
                      easing: emphasisEase,
                    },
                  );

                  return (
                    <div key={label} style={{marginBottom: 20}}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 19,
                          fontWeight: 900,
                          marginBottom: 8,
                        }}
                      >
                        <span>{label}</span>
                        <span style={{color: colors.muted, fontWeight: 760}}>
                          {text}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 999,
                          background: '#EEEAF8',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${barWidth}%`,
                            borderRadius: 999,
                            background:
                              index % 2 === 0 ? colors.violet : colors.rose,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </MacWindow>
    </AbsoluteFill>
  );
};

const ScriptsScene: React.FC<{localFrame: number; duration: number}> = ({
  localFrame,
  duration,
}) => {
  const opacity = fadeForScene(localFrame, duration);

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 104, top: 108}}>
        <SceneTitle
          eyebrow="Step 4"
          title="Generate scripts from proven patterns"
          maxWidth={790}
        />
      </div>
      <MacWindow
        title="Scripts"
        screenshotKey="scripts"
        width={1100}
        height={690}
        style={{position: 'absolute', right: 96, top: 190}}
      >
        <div style={{display: 'flex', height: 'calc(100% - 58px)'}}>
          <Sidebar />
          <div style={{flex: 1, padding: 32}}>
            <div
              style={{
                borderRadius: 28,
                background: colors.ink,
                color: '#FFFFFF',
                padding: 28,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 950,
                  letterSpacing: 2,
                  color: '#C7BDFB',
                  textTransform: 'uppercase',
                }}
              >
                Source pattern
              </div>
              <div style={{fontSize: 34, fontWeight: 950, marginTop: 10}}>
                Contrarian opener to proof to actionable CTA
              </div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
              {scriptLines.map((line, index) => {
                const local = localFrame - index * 10;
                const opacityLine = interpolate(local, [0, 20], [0, 1], easeClamp);
                const x = interpolate(local, [0, 24], [40, 0], easeClamp);

                return (
                  <div
                    key={line}
                    style={{
                      minHeight: 132,
                      borderRadius: 24,
                      background: '#FFFFFF',
                      border: '1px solid rgba(20,16,34,0.08)',
                      padding: 24,
                      boxShadow: '0 18px 50px rgba(20,16,34,0.07)',
                      opacity: opacityLine,
                      transform: `translateX(${x}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: index % 2 === 0 ? colors.roseSoft : '#EEE8FF',
                        color: index % 2 === 0 ? colors.rose : colors.violet,
                        fontSize: 20,
                        fontWeight: 950,
                        marginBottom: 14,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{fontSize: 23, lineHeight: 1.16, fontWeight: 900}}>
                      {line}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </MacWindow>
    </AbsoluteFill>
  );
};

const Phone: React.FC<{localFrame: number}> = ({localFrame}) => {
  const messageOpacity = interpolate(localFrame, [18, 38], [0, 1], easeClamp);
  const responseOpacity = interpolate(localFrame, [48, 68], [0, 1], easeClamp);

  return (
    <div
      style={{
        width: 410,
        height: 750,
        borderRadius: 54,
        background: colors.ink,
        padding: 22,
        boxShadow: '0 42px 110px rgba(20,16,34,0.26)',
      }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: 38,
          background: '#F9F7FF',
          padding: 24,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 72,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderBottom: '1px solid rgba(20,16,34,0.08)',
            marginBottom: 30,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: colors.violet,
            }}
          />
          <div>
            <div style={{fontSize: 18, fontWeight: 950}}>Auto DM</div>
            <div style={{fontSize: 13, color: colors.teal, fontWeight: 850}}>
              active
            </div>
          </div>
        </div>
        <div
          style={{
            marginLeft: 66,
            borderRadius: '24px 24px 8px 24px',
            background: colors.violet,
            color: '#FFFFFF',
            padding: 20,
            fontSize: 22,
            lineHeight: 1.15,
            fontWeight: 820,
            opacity: messageOpacity,
          }}
        >
          Comment "vault" and I will send the swipe file.
        </div>
        <div
          style={{
            marginTop: 28,
            marginRight: 48,
            borderRadius: '24px 24px 24px 8px',
            background: '#FFFFFF',
            color: colors.ink,
            border: '1px solid rgba(20,16,34,0.08)',
            padding: 20,
            fontSize: 22,
            lineHeight: 1.15,
            fontWeight: 820,
            opacity: responseOpacity,
          }}
        >
          Here is the resource. Want the full checklist too?
        </div>
        <div
          style={{
            marginTop: 34,
            borderRadius: 26,
            background: '#FFFFFF',
            border: '1px solid rgba(20,16,34,0.08)',
            padding: 22,
            opacity: responseOpacity,
          }}
        >
          <div style={{fontSize: 15, color: colors.muted, fontWeight: 850}}>
            Lead form opened
          </div>
          <div style={{fontSize: 30, fontWeight: 950, marginTop: 10}}>
            418 leads
          </div>
        </div>
      </div>
    </div>
  );
};

const AutoDmScene: React.FC<{localFrame: number; duration: number}> = ({
  localFrame,
  duration,
}) => {
  const opacity = fadeForScene(localFrame, duration);
  const hasAutodmScreenshot = realAppScreenshots.images.autodm.captured;

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 104, top: 138}}>
        <SceneTitle
          eyebrow="Step 5"
          title="Turn engagement into conversations"
          maxWidth={820}
        />
        <div style={{display: 'flex', gap: 18, marginTop: 52, width: 780}}>
          <MetricCard label="Replies sent" value="1,240" color={colors.violet} />
          <MetricCard label="Leads" value="418" color={colors.teal} delay={10} />
          <MetricCard label="Flows" value="9" color={colors.rose} delay={20} />
        </div>
      </div>
      {hasAutodmScreenshot ? (
        <MacWindow
          title="Auto DM"
          screenshotKey="autodm"
          width={1040}
          height={620}
          style={{
            position: 'absolute',
            right: 70,
            top: 206,
            opacity: 0.96,
          }}
        >
          <div />
        </MacWindow>
      ) : null}
      <div
        style={{
          position: 'absolute',
          right: hasAutodmScreenshot ? 94 : 210,
          top: hasAutodmScreenshot ? 272 : 150,
          transform: hasAutodmScreenshot ? 'scale(0.66)' : undefined,
          transformOrigin: 'top right',
        }}
      >
        <Phone localFrame={localFrame} />
      </div>
    </AbsoluteFill>
  );
};

const FinalScene: React.FC<{localFrame: number; duration: number}> = ({
  localFrame,
  duration,
}) => {
  const opacity = fadeForScene(localFrame, duration);
  const progress = sceneProgress(localFrame, duration);

  return (
    <AbsoluteFill style={{opacity}}>
      <div
        style={{
          position: 'absolute',
          left: 126,
          right: 126,
          top: 110,
          bottom: 190,
          borderRadius: 56,
          background: colors.ink,
          color: '#FFFFFF',
          padding: 78,
          boxShadow: '0 48px 130px rgba(20,16,34,0.28)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.42), transparent 45%, rgba(244,63,94,0.36))',
            opacity: 0.9,
          }}
        />
        <div style={{position: 'relative', zIndex: 1}}>
          <BrandMark large light />
          <h2
            style={{
              fontSize: 88,
              lineHeight: 0.98,
              letterSpacing: 0,
              fontWeight: 960,
              maxWidth: 1120,
              margin: '72px 0 0',
            }}
          >
            Scan your niche. Learn what works. Ship sharper content.
          </h2>
          <div
            style={{
              marginTop: 58,
              display: 'flex',
              gap: 18,
            }}
          >
            {['Find outliers', 'Generate scripts', 'Capture leads'].map(
              (item, index) => (
                <div
                  key={item}
                  style={{
                    borderRadius: 999,
                    padding: '18px 26px',
                    background:
                      index === 1 ? colors.rose : 'rgba(255,255,255,0.13)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    fontSize: 25,
                    fontWeight: 930,
                    transform: `translateY(${interpolate(
                      progress,
                      [0.15 + index * 0.08, 0.36 + index * 0.08],
                      [28, 0],
                      {
                        ...clamp,
                        easing: emphasisEase,
                      },
                    )}px)`,
                    opacity: interpolate(
                      progress,
                      [0.12 + index * 0.08, 0.34 + index * 0.08],
                      [0, 1],
                      {
                        ...clamp,
                        easing: emphasisEase,
                      },
                    ),
                  }}
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ProductDemoThumbnail: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'linear-gradient(135deg, #F7F4FF 0%, #FFFFFF 48%, #FFF1F4 100%)',
      color: colors.ink,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}
  >
    <AnimatedGrid />
    <div style={{position: 'absolute', left: 92, top: 62}}>
      <BrandMark />
    </div>
    <div
      style={{
        position: 'absolute',
        left: 110,
        right: 110,
        top: 132,
        bottom: 112,
        borderRadius: 58,
        background: colors.ink,
        overflow: 'hidden',
        boxShadow: '0 48px 140px rgba(20,16,34,0.22)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 78% 28%, rgba(244,63,94,0.55), transparent 26%), radial-gradient(circle at 22% 18%, rgba(124,58,237,0.74), transparent 32%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          padding: '76px 88px',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: 60,
          alignItems: 'center',
        }}
      >
        <div>
          <Kicker>Product demo</Kicker>
          <h1
            style={{
              margin: '34px 0 0',
              color: '#FFFFFF',
              fontSize: 86,
              lineHeight: 0.96,
              letterSpacing: 0,
              fontWeight: 960,
            }}
          >
            Find viral outliers. Turn them into scripts and leads.
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.72)',
              fontSize: 30,
              lineHeight: 1.22,
              fontWeight: 760,
              marginTop: 32,
              maxWidth: 780,
            }}
          >
            A 90-second walkthrough of Scan My Social for creators, agencies,
            and growth teams.
          </p>
        </div>
        <div
          style={{
            borderRadius: 38,
            background: 'rgba(255,255,255,0.92)',
            padding: 30,
            boxShadow: '0 38px 110px rgba(0,0,0,0.22)',
          }}
        >
          {sampleVideos.slice(0, 3).map((video, index) => (
            <div
              key={video.creator}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                borderRadius: 26,
                background: index === 0 ? '#FFFFFF' : '#F7F4FF',
                border: '1px solid rgba(20,16,34,0.08)',
                padding: 22,
                marginBottom: index === 2 ? 0 : 18,
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 22,
                  background: `linear-gradient(135deg, ${video.color}, #141022)`,
                }}
              />
              <div style={{flex: 1}}>
                <div
                  style={{
                    color: colors.muted,
                    fontSize: 16,
                    fontWeight: 860,
                  }}
                >
                  {video.creator}
                </div>
                <div
                  style={{
                    color: colors.ink,
                    fontSize: 23,
                    fontWeight: 940,
                    lineHeight: 1.08,
                    marginTop: 5,
                  }}
                >
                  {video.title}
                </div>
              </div>
              <div
                style={{
                  borderRadius: 999,
                  background: `${video.color}18`,
                  color: video.color,
                  padding: '10px 14px',
                  fontSize: 24,
                  fontWeight: 950,
                }}
              >
                {video.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

const SceneRenderer: React.FC<{sceneId: string; localFrame: number; duration: number}> = ({
  sceneId,
  localFrame,
  duration,
}) => {
  if (sceneId === 'cold-open') {
    return <ColdOpenScene localFrame={localFrame} duration={duration} />;
  }

  if (sceneId === 'product-reveal') {
    return <ProductRevealScene localFrame={localFrame} duration={duration} />;
  }

  if (sceneId === 'channels') {
    return <ChannelsScene localFrame={localFrame} duration={duration} />;
  }

  if (sceneId === 'outliers') {
    return <OutliersScene localFrame={localFrame} duration={duration} />;
  }

  if (sceneId === 'analysis') {
    return <AnalysisScene localFrame={localFrame} duration={duration} />;
  }

  if (sceneId === 'scripts') {
    return <ScriptsScene localFrame={localFrame} duration={duration} />;
  }

  if (sceneId === 'autodm') {
    return <AutoDmScene localFrame={localFrame} duration={duration} />;
  }

  return <FinalScene localFrame={localFrame} duration={duration} />;
};

export const ScanMySocialDemo: React.FC<DemoProps> = ({
  includeVoiceover = true,
  voiceoverPath = 'audio/voiceover.mp3',
  includeMusic = true,
  musicPath = 'audio/music-bed.wav',
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progressWidth = interpolate(frame, [0, durationInFrames], [0, 100], clamp);

  return (
    <Container>
      <AnimatedGrid />
      {includeMusic ? (
        <Audio
          src={staticFile(musicPath)}
          loop
          volume={(audioFrame) =>
            interpolate(
              audioFrame,
              [0, 1.5 * FPS, durationInFrames - 2.5 * FPS, durationInFrames],
              [0, 0.18, 0.18, 0],
              clamp,
            )
          }
        />
      ) : null}
      {includeVoiceover ? (
        <Audio src={staticFile(voiceoverPath)} volume={0.96} />
      ) : null}
      <div style={{position: 'absolute', left: 84, top: 54, zIndex: 20}}>
        <BrandMark />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 88,
          top: 62,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          zIndex: 20,
          fontSize: 18,
          fontWeight: 900,
          color: colors.muted,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: colors.teal,
            boxShadow: '0 0 0 8px rgba(16,185,129,0.12)',
          }}
        />
        Product demo
      </div>
      {scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.start}
          durationInFrames={scene.duration}
        >
          <SceneRenderer
            sceneId={scene.id}
            localFrame={frame - scene.start}
            duration={scene.duration}
          />
        </Sequence>
      ))}
      <CaptionBar />
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 8,
          width: `${progressWidth}%`,
          background: `linear-gradient(90deg, ${colors.violet}, ${colors.rose})`,
          zIndex: 40,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 96,
          bottom: 68,
          color: 'rgba(255,255,255,0.62)',
          fontSize: 14,
          fontWeight: 850,
          zIndex: 45,
        }}
      >
        {Math.min(Math.floor(frame / FPS), VIDEO_SECONDS)}s / {VIDEO_SECONDS}s
      </div>
    </Container>
  );
};
