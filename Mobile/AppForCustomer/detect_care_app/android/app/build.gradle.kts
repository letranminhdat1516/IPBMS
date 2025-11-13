plugins {
    id("com.android.application")
    kotlin("android") // thay vì id("kotlin-android")
    id("com.google.gms.google-services")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.detect_care_app"

    // Lấy từ Flutter extension (đúng với Flutter Gradle plugin)
    compileSdk = flutter.compileSdkVersion
    // Chỉ giữ khi thật sự cần một NDK cụ thể
    // ndkVersion = "27.0.12077973"

    defaultConfig {
        applicationId = "com.example.detect_care_app"
        minSdk = 23
        targetSdk = flutter.targetSdkVersion

        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // Java/Kotlin 17 để đồng bộ với AGP 8 / JDK 17
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildTypes {
        release {
            // Dev tạm thời ký bằng debug, trước khi release hãy tạo keystore riêng
            signingConfig = signingConfigs.getByName("debug")
            // Tuỳ chọn tối ưu:
            // isMinifyEnabled = true
            // proguardFiles(
            //     getDefaultProguardFile("proguard-android-optimize.txt"),
            //     "proguard-rules.pro"
            // )
        }
        debug { }
    }

    // Tuỳ chọn: tránh đụng trùng tài nguyên META-INF
    packaging {
        resources.excludes += setOf("META-INF/DEPENDENCIES")
    }
}

dependencies {
    // Desugaring cho Java 8+ APIs
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")

    // (tuỳ chọn nếu dùng Firebase…)
    // implementation(platform("com.google.firebase:firebase-bom:33.4.0"))
    // implementation("com.google.firebase:firebase-analytics-ktx")
}

flutter {
    source = "../.."
}
