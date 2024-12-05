import { useEffect, useState } from "react";
import "./Bench.css";
import Confetti from "react-confetti-boom";



export const sampleVTT = `WEBVTT

0
00:00:00.019 --> 00:00:00.029
Uh,

1
00:00:00.930 --> 00:00:05.159
this is Houston. Uh Say again, please, Houston, we have a problem.

2
00:00:07.030 --> 00:00:09.109
We have a main bus be under vault.

3
00:00:09.779 --> 00:00:13.220
We've got a lot of thruster activity here in Houston. We just went offline.

4
00:00:13.939 --> 00:00:15.979
There's another master alarm. Houston.

5
00:00:16.190 --> 00:00:16.209
I'm

6
00:00:17.329 --> 00:00:17.350
no

7
00:00:17.680 --> 00:00:17.819
repress.

8
00:00:18.870 --> 00:00:19.719
We've got a computer.

9
00:00:20.760 --> 00:00:21.819
The R CS, we've got

10
00:00:22.020 --> 00:00:22.030
a

11
00:00:22.239 --> 00:00:22.420
live

12
00:00:22.690 --> 00:00:22.790
fire.

13
00:00:23.420 --> 00:00:27.329
We've got multiple caution and warning Houston. We've got to reset, restart.

14
00:00:27.340 --> 00:00:28.469
All right, I'm going to SBS

15
00:00:31.489 --> 00:00:32.400
Jesus.

16
00:00:33.020 --> 00:00:34.740
It's like the heart rates are skyrocketing,

17
00:00:35.069 --> 00:00:36.659
econ. What's your data telling you?

18
00:00:36.779 --> 00:00:43.560
Two? Tank two not reading at all? Tank one is at 725 P si and falling fuel cells.

19
00:00:43.569 --> 00:00:45.220
One and three are,

20
00:00:45.930 --> 00:00:49.340
oh boy. What's going on here? Flight? Let me get back to you. Flight GNC

21
00:00:50.450 --> 00:00:52.880
flight. They're all over the place. They keep going close to gimbal lock.

22
00:00:52.990 --> 00:00:56.389
I keep losing radio signal. Their antenna must be 22.

23
00:00:56.400 --> 00:00:57.520
They're gonna have to do it manually.

24
00:00:57.580 --> 00:01:00.470
One at a time, people, one at a time, one at a time.

25
00:01:00.650 --> 00:01:00.720
E

26
00:01:01.090 --> 00:01:04.638
is this an instrumentation problem or are we looking at real power loss here?

27
00:01:04.650 --> 00:01:08.989
It's reading a quadruple failure that can't happen. It's got to be instrumentation

28
00:01:09.120 --> 00:01:11.709
let's get that hat button. The limb might have been hit by a meteor.

29
00:01:11.720 --> 00:01:13.339
The tunnel's really torque it with all.

30
00:01:15.559 --> 00:01:19.000
Uh Houston. We got a pretty large bang there associated with a master alarm.

31
00:01:19.529 --> 00:01:21.180
Shit. It's main bus. A

32
00:01:22.709 --> 00:01:25.819
Houston. We have a main bus, a under bolt now too. Uh

33
00:01:26.430 --> 00:01:30.190
It's reading 25.5. Main bus B is reading zip right now.

34
00:01:30.440 --> 00:01:32.440
We got a wicked shimmy up here.

35
00:01:32.779 --> 00:01:32.800
You

36
00:01:33.069 --> 00:01:35.559
come TNC these guys are talking about bangs and shimmies up there.

37
00:01:35.569 --> 00:01:37.120
It doesn't sound like instrumentation to me.

38
00:01:37.430 --> 00:01:37.470
You

39
00:01:37.629 --> 00:01:37.669
are,

40
00:01:38.760 --> 00:01:41.319
you got this half the seal just, just do

41
00:01:41.430 --> 00:01:41.550
it.

42
00:01:42.279 --> 00:01:44.480
We've been hit by A me. We'd be dead by now.

43
00:01:45.080 --> 00:01:46.290
You're gonna try to get us out of this L

44
00:01:46.620 --> 00:01:49.290
you're in the mud. Did you say switch to Omni Bravo

45
00:01:50.580 --> 00:01:54.349
Roger and the signal straight on the fighting me. What's the story here? Jack?

46
00:01:54.360 --> 00:01:55.510
We keep flirting with Gimble

47
00:01:55.669 --> 00:01:55.800
lock.

48
00:01:58.660 --> 00:01:59.489
Do you have down?

49
00:02:01.360 --> 00:02:01.750
Ok.

50
00:02:02.370 --> 00:02:04.230
Smr CS helium one

51
00:02:06.019 --> 00:02:09.910
Barber pole Houston, I'm switching over quad C to main A.

52
00:02:10.899 --> 00:02:14.139
Ok. Houston fuel cell, one, fuel cell three.

53
00:02:14.399 --> 00:02:16.630
We got a main bus B under volt Bry

54
00:02:16.860 --> 00:02:17.509
pressure

55
00:02:17.979 --> 00:02:20.220
suit compressor. What do we have

56
00:02:20.440 --> 00:02:21.750
AC bus one

57
00:02:22.070 --> 00:02:23.520
AC bus two

58
00:02:23.649 --> 00:02:25.259
command module computer

59
00:02:25.710 --> 00:02:27.100
and 02 flow high.

60
00:02:27.419 --> 00:02:30.300
I don't know. Maybe this is a caution and warning. Houston.

61
00:02:31.850 --> 00:02:34.149
We are venting something out into space.

62
00:02:35.949 --> 00:02:39.139
I can see it outside of window one right now.

63
00:02:41.009 --> 00:02:42.089
Definitely uh

64
00:02:43.500 --> 00:02:45.279
a gas of some sort.

65
00:02:47.770 --> 00:02:49.059
It's gonna be the Oxygen

66
00:03:07.779 --> 00:03:10.479
Roger Odyssey. We copy your venting. Give me an alarm

67
00:03:11.770 --> 00:03:12.800
into a four levels.

68
00:03:13.020 --> 00:03:13.050
Ok.

69
00:03:13.600 --> 00:03:14.300
Let's start

70
00:03:14.460 --> 00:03:14.660
right

71
00:03:15.080 --> 00:03:15.100
out

72
00:03:15.679 --> 00:03:15.699
of

73
00:03:17.669 --> 00:03:17.970
Madrid.

74
00:03:28.470 --> 00:03:28.539
Ok.

75
00:03:33.330 --> 00:03:34.139
Quiet down,

76
00:03:34.529 --> 00:03:35.479
quiet down.

77
00:03:35.660 --> 00:03:36.919
Let's stay cool people.

78
00:03:37.699 --> 00:03:40.229
Procedures. I need another computer up in the RT CC.

79
00:03:40.500 --> 00:03:40.509
I

80
00:03:40.639 --> 00:03:43.139
want everybody to alert your support teams.

81
00:03:43.240 --> 00:03:45.429
Wake up anybody you need, get them in here.

82
00:03:46.600 --> 00:03:50.710
Let's work the problem people. Let's not make things worse by guessing.`;

export function parseVTT(text: string) {


  // Simple parsing for cues
  const cues = [];
  const lines = text.split('\n');
  let currentCue = null;

  for (const line of lines) {
    if (line.trim() === '') {
      if (currentCue) {
        cues.push(currentCue);
        currentCue = null;
      }
      continue;
    }

    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const timestampToSeconds = (timestamp: string): number => {
      const [hours, minutes, seconds] = timestamp.split(':').map(Number);
      return hours * 3600 + minutes * 60 + seconds;
    };

    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(t => t.trim());
currentCue = {
  start: timestampToSeconds(start),
  end: timestampToSeconds(end),
  formattedStart: formatTime(timestampToSeconds(start)),
  text: ''
};
    } else if (currentCue) {
      currentCue.text += `${line.trim()} `;
    }
  }

  return cues.map(cue => ({ ...cue, text: cue.text.trim() }));
}
const largeProps = {
  force: 0.8,
  duration: 3000,
  particleCount: 300,
  colors: ['#ff577f', '#ff884b', '#ffd384', '#fff9b0'],
};

export default function Bench() {

  const [confetti, setConfetti] = useState(false);

    return (
    <>
    <button onClick={() => setConfetti(!confetti)}>CONFETTI!!!</button>
      {confetti && 
      <>
      <Confetti mode='boom' particleCount={250} effectInterval={3000} colors={['#ff577f', '#ff884b', '#ffd384', '#fff9b0']} launchSpeed={1.8} spreadDeg={60}/>
      </>
      }
    </>
    );
}