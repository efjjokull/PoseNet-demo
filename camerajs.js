/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

// const stats = new Stats();

// Parameter setting
const videoWidth = 600;
const videoHeight = 480;
const outputStride = 16;
const imageScaleFactor = 0.2;
const minConfidence = 0.1;
const minPartConfidence = 0.5;
const lineWidth = 2;
const color = 'green';
const boundingBoxColor = 'red';


function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  const flipPoseHorizontal = true;

  async function poseDetectionFrame() {
    // Begin monitoring code for frames per second
    // stats.begin();
    let poses = [];
    const pose = await net.estimateSinglePose(output,imageScaleFactor,flipPoseHorizontal,outputStride)
    poses = poses.concat(pose);

    ctx.clearRect(0, 0, videoWidth, videoHeight);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    poses.forEach(({score, keypoints}) => {
      drawKeypoints(keypoints, ctx);
      drawSkeleton(keypoints, minPartConfidence, ctx);
      // drawBoundingBox(keypoints,ctx);
    });

    // End monitoring code for frames per second
    // stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

function drawKeypoints(keypoints, ctx, scale = 1) {
  for (let i = 0; i < keypoints.length; i++) {
      const keypoint = keypoints[i];
    if(keypoint.score < minConfidence){
      continue;
    } else{
      const {y, x} = keypoint.position;
      drawPoint(ctx, y * scale, x * scale, 7, color);
    }    
  }
}

function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}
//
function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints =
      posenet.getAdjacentKeyPoints(keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
        toTuple(keypoints[0].position), toTuple(keypoints[1].position), color,
        scale, ctx);
  });
}

function drawBoundingBox(keypoints, ctx) {
  const boundingBox = posenet.getBoundingBox(keypoints);

  ctx.rect(
      boundingBox.minX, boundingBox.minY, boundingBox.maxX - boundingBox.minX,
      boundingBox.maxY - boundingBox.minY);

  ctx.strokeStyle = boundingBoxColor;
  ctx.stroke();
}

function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function toTuple({y, x}) {
  return [y, x];
}

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': true,
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();
  return video;
}

async function bindPage() {

  const net = await posenet.load({
    architecture: 'MobileNetV1',
    outputStride: outputStride,
    inputResolution: { width: videoWidth, height: videoHeight },
    multiplier: 0.75,
    quantBytes: 2,
  });

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
      console.error(e);
      return video;
  }
  detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();
