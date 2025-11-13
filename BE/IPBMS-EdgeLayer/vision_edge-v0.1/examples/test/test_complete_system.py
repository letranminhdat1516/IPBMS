#!/usr/bin/env python3
"""
Complete System Test - Sử dụng TOÀN BỘ logic từ src/
Test với video input, output CSV chi tiết cho mỗi video
"""

import os
import sys
import cv2
import time
import logging
from pathlib import Path
from datetime import datetime
import pandas as pd

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

# Import video camera
from video_camera_service import VideoCameraService

# Import TẤT CẢ services từ src/ - GIỐNG MAIN.PY
from video_processing.simple_processing import IntegratedVideoProcessor
from service.fall_detection_service import FallDetectionService
from service.seizure_detection_service import SeizureDetectionService
from seizure_detection.seizure_predictor import SeizurePredictor
from service.advanced_healthcare_pipeline import AdvancedHealthcarePipeline

# Import intelligent actions (Vietnamese caption)
try:
    from service.ai_vision_description_service import get_professional_caption_pipeline
    CAPTION_AVAILABLE = True
    print("🤖 Vietnamese Caption: AVAILABLE")
except ImportError:
    CAPTION_AVAILABLE = False
    print("📝 Vietnamese Caption: NOT AVAILABLE")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CompleteSystemTester:
    """Test hệ thống hoàn chỉnh với video input"""
    
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.resource_folder = self.script_dir / "resource"
        self.output_base = self.script_dir / "test_results"
        self.user_id = os.getenv('DEFAULT_USER_ID', 'test_user_001')
        
        # Output folders
        self.output_folders = {
            'reports': self.output_base / 'reports',
            'alerts': self.output_base / 'alerts',
            'keypoints': self.output_base / 'keypoints'
        }
        
        for folder in self.output_folders.values():
            folder.mkdir(parents=True, exist_ok=True)
    
    def find_video(self, video_number: int) -> Path:
        """Tìm video theo số"""
        video_path_lower = self.resource_folder / f"{video_number}.mp4"
        video_path_upper = self.resource_folder / f"{video_number}.MP4"
        
        if video_path_lower.exists():
            return video_path_lower
        elif video_path_upper.exists():
            return video_path_upper
        else:
            raise FileNotFoundError(f"Video {video_number} not found")
    
    def test_video(self, video_number: int):
        """
        Test 1 video với TOÀN BỘ HỆ THỐNG
        Output: 1 CSV file chi tiết
        """
        
        video_path = self.find_video(video_number)
        video_name = video_path.stem
        
        print("\n" + "="*120)
        print(f"🎬 TESTING VIDEO #{video_number}: {video_name}")
        print("="*120)
        print(f"📹 Path: {video_path}")
        print(f"🎯 Mode: COMPLETE SYSTEM TEST (All logic from src/)")
        print("="*120 + "\n")
        
        # Setup camera
        camera_config = {
            'video_path': str(video_path),
            'fps': 30,
            'resolution': None,  # Giữ nguyên resolution gốc
            'camera_id': f"test_video_{video_number}",
            'camera_name': video_name,
            'loop': False
        }
        
        alerts_folder = str(self.output_folders['alerts'] / f"video_{video_number}")
        Path(alerts_folder).mkdir(parents=True, exist_ok=True)
        
        print("🔧 Initializing COMPLETE SYSTEM...")
        
        # 1. Camera
        camera = VideoCameraService(camera_config)
        if not camera.connect():
            print(f"❌ Failed to load video")
            return None
        
        # 2. Video Processor - OPTIMIZED
        video_processor = IntegratedVideoProcessor(
            motion_threshold=1,
            keyframe_threshold=0.1,
            yolo_confidence=0.15,  # Low confidence for better detection
            save_frames=False
        )
        
        # 3. Fall & Seizure Detectors
        fall_detector = FallDetectionService(confidence_threshold=0.05)
        seizure_detector = SeizureDetectionService()
        seizure_predictor = SeizurePredictor(
            temporal_window=5,
            alert_threshold=0.02,
            warning_threshold=0.01
        )
        
        # 4. Healthcare Pipeline (FULL SYSTEM)
        pipeline = AdvancedHealthcarePipeline(
            camera=camera,
            video_processor=video_processor,
            fall_detector=fall_detector,
            seizure_detector=seizure_detector,
            seizure_predictor=seizure_predictor,
            alerts_folder=alerts_folder,
            camera_id=camera_config['camera_id'],
            user_id=self.user_id
        )
        
        # 5. Caption Generator (Vietnamese)
        caption_pipeline = None
        if CAPTION_AVAILABLE:
            try:
                caption_pipeline = get_professional_caption_pipeline()
                print("🤖 Vietnamese caption generator: READY")
            except Exception as e:
                print(f"⚠️ Caption generator failed: {e}")
        
        print("✅ COMPLETE SYSTEM READY!")
        print("="*120)
        
        # ==================== PROCESSING ====================
        
        print(f"\n🎥 Processing video #{video_number}...")
        print("="*120 + "\n")
        
        all_detections = []  # Lưu MỌI detection để export CSV
        frame_count = 0
        start_time = time.time()
        
        # Stats
        stats = {
            'total_frames': 0,
            'frames_processed': 0,
            'persons_detected': 0,
            'fall_events': 0,
            'seizure_events': 0,
            'critical_alerts': 0
        }
        
        while True:
            frame = camera.get_frame()
            if frame is None:
                print(f"\n✅ Video completed!")
                break
            
            frame_count += 1
            stats['total_frames'] += 1
            
            # Process frame qua FULL PIPELINE
            result = pipeline.process_frame(frame)
            detection_result = result.get("detection_result", {})
            person_detections = result.get("person_detections", [])
            
            # Count persons
            if person_detections:
                stats['persons_detected'] += len(person_detections)
            
            # Check for alerts
            alert_level = detection_result.get('alert_level', 'normal')
            
            if alert_level in ['critical', 'high', 'warning']:
                stats['frames_processed'] += 1
                
                emergency_type = detection_result.get('emergency_type', 'unknown')
                
                # Get confidence
                if 'fall' in emergency_type:
                    confidence = detection_result.get('fall_confidence', 0)
                    stats['fall_events'] += 1
                elif 'seizure' in emergency_type or 'abnormal' in emergency_type:
                    confidence = detection_result.get('seizure_confidence', 0)
                    stats['seizure_events'] += 1
                else:
                    confidence = 0
                
                if alert_level == 'critical':
                    stats['critical_alerts'] += 1
                
                # Find alert image
                alert_image_filename = None
                alert_image_path = None
                try:
                    alerts_dir = Path(alerts_folder)
                    if alerts_dir.exists():
                        alert_files = sorted(alerts_dir.glob("*.jpg"), 
                                            key=lambda x: x.stat().st_mtime, reverse=True)
                        if alert_files:
                            alert_image_path = alert_files[0]
                            alert_image_filename = alert_image_path.name
                except Exception as e:
                    logger.error(f"Error finding alert image: {e}")
                
                # Generate Vietnamese caption
                vietnamese_caption = ""
                recommended_action = ""
                
                if CAPTION_AVAILABLE and caption_pipeline and alert_image_path:
                    try:
                        caption_result = caption_pipeline(str(alert_image_path))
                        if caption_result:
                            vietnamese_caption = caption_result.get('vietnamese_caption', '')
                            recommended_action = caption_result.get('recommended_action', '')
                    except Exception as e:
                        logger.error(f"Caption error: {e}")
                
                # Fallback captions nếu không có AI
                if not vietnamese_caption:
                    if 'fall' in emergency_type:
                        vietnamese_caption = "Phát hiện té ngã - Cần hỗ trợ khẩn cấp"
                        recommended_action = "Kiểm tra người bệnh ngay lập tức. Gọi hỗ trợ y tế nếu cần."
                    elif 'seizure' in emergency_type or 'abnormal' in emergency_type:
                        vietnamese_caption = "Phát hiện hành vi bất thường - Cần theo dõi"
                        recommended_action = "Quan sát người bệnh. Chuẩn bị hỗ trợ y tế."
                    else:
                        vietnamese_caption = "Phát hiện sự kiện y tế"
                        recommended_action = "Kiểm tra tình trạng người bệnh"
                
                # Lưu detection record
                detection_record = {
                    'Video_Number': video_number,
                    'Video_Name': video_name,
                    'Frame': frame_count,
                    'Timestamp_Seconds': frame_count / 30.0,  # Assuming 30 FPS
                    'Event_Type': emergency_type,
                    'Alert_Level': alert_level,
                    'Confidence': confidence,
                    'Persons_Detected': len(person_detections),
                    'Alert_Image_Filename': alert_image_filename or '',
                    'Vietnamese_Caption': vietnamese_caption,
                    'Recommended_Action': recommended_action,
                    'Processing_Time': time.time() - start_time
                }
                
                all_detections.append(detection_record)
                
                # Print alert
                print(f"\n{'='*120}")
                print(f"🚨 ALERT #{len(all_detections)} - Frame {frame_count}")
                print(f"{'='*120}")
                print(f"   Type: {emergency_type}")
                print(f"   Level: {alert_level}")
                print(f"   Confidence: {confidence:.2%}")
                print(f"   🇻🇳 Caption: {vietnamese_caption}")
                print(f"   📝 Action: {recommended_action}")
                if alert_image_filename:
                    print(f"   📸 Image: {alert_image_filename}")
                print(f"{'='*120}\n")
            
            # Progress log
            if frame_count % 100 == 0:
                camera_status = camera.get_status()
                print(f"📊 Progress: {camera_status['progress']} - "
                      f"Frame {frame_count}/{camera.total_frames} - "
                      f"Alerts: {len(all_detections)}")
        
        # ==================== GENERATE CSV ====================
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"\n{'='*120}")
        print(f"✅ VIDEO #{video_number} COMPLETED")
        print(f"{'='*120}")
        print(f"⏱️  Processing Time: {processing_time:.2f}s")
        print(f"🎞️  Total Frames: {frame_count}")
        print(f"👤 Persons Detected: {stats['persons_detected']}")
        print(f"🚨 Total Alerts: {len(all_detections)}")
        print(f"   - Falls: {stats['fall_events']}")
        print(f"   - Seizures: {stats['seizure_events']}")
        print(f"   - Critical: {stats['critical_alerts']}")
        print(f"⚡ FPS: {frame_count / processing_time:.2f}")
        print(f"{'='*120}\n")
        
        # Generate CSV
        self._generate_csv(video_number, video_name, video_path, 
                          processing_time, frame_count, all_detections, stats)
        
        # Cleanup
        camera.disconnect()
        
        return {
            'video_number': video_number,
            'video_name': video_name,
            'total_detections': len(all_detections),
            'stats': stats
        }
    
    def _generate_csv(self, video_number, video_name, video_path,
                     processing_time, total_frames, detections, stats):
        """Generate detailed CSV file"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"video_{video_number:02d}_{video_name}_test_{timestamp}.csv"
        csv_path = self.output_folders['reports'] / csv_filename
        
        if not detections:
            # Tạo CSV rỗng với header
            df = pd.DataFrame(columns=[
                'Video_Number', 'Video_Name', 'Frame', 'Timestamp_Seconds',
                'Event_Type', 'Alert_Level', 'Confidence', 'Persons_Detected',
                'Alert_Image_Filename', 'Vietnamese_Caption', 'Recommended_Action',
                'Processing_Time'
            ])
            
            # Add summary row
            summary = pd.DataFrame([{
                'Video_Number': video_number,
                'Video_Name': f"SUMMARY: {video_name}",
                'Frame': f"Total: {total_frames}",
                'Timestamp_Seconds': processing_time,
                'Event_Type': 'NO EVENTS DETECTED',
                'Alert_Level': 'N/A',
                'Confidence': 0,
                'Persons_Detected': stats['persons_detected'],
                'Alert_Image_Filename': '',
                'Vietnamese_Caption': 'Không phát hiện sự cố',
                'Recommended_Action': 'Hệ thống hoạt động bình thường',
                'Processing_Time': processing_time
            }])
            
            df = pd.concat([summary, df], ignore_index=True)
        else:
            # Create DataFrame from detections
            df = pd.DataFrame(detections)
            
            # Add summary row at top
            summary = pd.DataFrame([{
                'Video_Number': video_number,
                'Video_Name': f"SUMMARY: {video_name}",
                'Frame': f"Total: {total_frames}",
                'Timestamp_Seconds': processing_time,
                'Event_Type': f"{stats['fall_events']} falls, {stats['seizure_events']} seizures",
                'Alert_Level': f"{stats['critical_alerts']} critical",
                'Confidence': f"{len(detections)} total alerts",
                'Persons_Detected': stats['persons_detected'],
                'Alert_Image_Filename': f"See {len(detections)} rows below",
                'Vietnamese_Caption': 'Tóm tắt kết quả test',
                'Recommended_Action': 'Xem chi tiết các sự kiện bên dưới',
                'Processing_Time': processing_time
            }])
            
            df = pd.concat([summary, df], ignore_index=True)
        
        # Save CSV
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')  # utf-8-sig for Excel compatibility
        
        print(f"📄 CSV Report saved: {csv_path.name}")
        print(f"   Columns: {len(df.columns)}")
        print(f"   Rows: {len(df)} (1 summary + {len(detections)} detections)")
        
        return csv_path


def main():
    if len(sys.argv) < 2:
        print("="*120)
        print("🎬 Complete System Tester - Video Input")
        print("="*120)
        print("\nUsage:")
        print("  python test_complete_system.py <video_number>")
        print("\nExamples:")
        print("  python test_complete_system.py 1")
        print("  python test_complete_system.py 5")
        print("\nOutput:")
        print("  - 1 CSV file per video with ALL detections")
        print("  - Columns: Frame, Type, Confidence, Image, Caption (VN), Action")
        print("="*120)
        sys.exit(1)
    
    video_number = int(sys.argv[1])
    
    print("="*120)
    print("🏥 Vision Edge Healthcare - COMPLETE SYSTEM TEST")
    print("="*120)
    print("✅ Using ALL logic from src/")
    print("✅ Vietnamese caption generation")
    print("✅ Full pipeline: YOLO → Fall/Seizure Detection → Alerts → CSV")
    print("="*120 + "\n")
    
    tester = CompleteSystemTester()
    result = tester.test_video(video_number)
    
    if result:
        print(f"\n✅ Test completed successfully!")
        print(f"📊 Total detections: {result['total_detections']}")
        print(f"📁 Check test_results/reports/ for CSV file")


if __name__ == "__main__":
    main()
