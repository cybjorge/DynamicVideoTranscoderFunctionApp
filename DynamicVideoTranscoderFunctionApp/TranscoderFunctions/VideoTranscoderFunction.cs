using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Diagnostics;
using System;
using System.Text;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Text.Json;

namespace DynamicVideoTranscoderFunctionApp.TranscoderFunctions
{
    public static class VideoTranscoderFunction
    {
        [FunctionName("TranscodeVideo")]
        public static async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "transcode-video")] HttpRequest req,
    ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = Newtonsoft.Json.JsonConvert.DeserializeObject(requestBody);

            string videoId = data?.videoId;
            string duration = data?.duration;
            string startTimestamp = data?.newStartTime;
            var userData = data?.userData;
            var chunkId = data?.uniqueID;
            log.LogCritical($"{chunkId}");

            // Validate input parameters and return error if any of them is missing or invalid
            if (string.IsNullOrEmpty(videoId))
            {
                return new BadRequestObjectResult("Please provide a video ID.");
            }
            if (string.IsNullOrEmpty(duration))
            {
                return new BadRequestObjectResult("Please provide a duration.");
            }
            if (string.IsNullOrEmpty(startTimestamp))
            {
                return new BadRequestObjectResult("Please provide a start timestamp.");
            }
            if(userData == null)
            {
                return new BadRequestObjectResult("Please provide user data.");
            }
            //retrieve sql data
            var startFetchFromDb = DateTime.Now;
            VideoMetadata videoMetadata = FetchVideoMetadata(videoId);
            var stopFetchFromDb = DateTime.Now;
            
            log.LogCritical($"Time taken to fetch video metadata from database: {stopFetchFromDb - startFetchFromDb}");
            // debug and testing variables for command
            var debugDuration = 10;
            var debugResolution = userData?.deviceType == 101
                ? userData?.connectionSpeed == "4g" ? "1920x1080"
                : userData?.connectionSpeed == "3g" ? "1280x720"
                : "854x480"
                : userData?.deviceType == 110
                    ? userData?.connectionSpeed == "4g" ? "1280x720"
                    : "640x360"
                    : "854x480";
            var debugVideoCodec = userData?.deviceType == 101 ?
                userData.codecSupport == 1 ? "libvpx-vp9" :"libvpx-vp8" : "libvpx"; 
            var debugAudioCodec = "libvorbis";
            var debugBitrate = userData?.connectionSpeed == "4g"
                ? Math.Max(
                    videoMetadata.Bitrate >= 8000 ? 8000000 : videoMetadata.Bitrate >= 5000 ? 5000000 : 2000000, // Original bitrate approach
                    videoMetadata.ResolutionX >= 1920 && videoMetadata.ResolutionY >= 1080 ? 8000000 : videoMetadata.ResolutionX >= 1280 && videoMetadata.ResolutionY >= 720 ? 5000000 : 2000000 // Video resolution approach
                )
                : (userData?.connectionSpeed == "3g"
                    ? Math.Max(
                        videoMetadata.Bitrate >= 5000 ? 5000000 : 2000000, // Adjusted for 3G connection (original bitrate approach)
                        videoMetadata.ResolutionX >= 1280 && videoMetadata.ResolutionY >= 720 ? 2000000 : 1000000 // Adjusted for 3G connection (video resolution approach)
                    )
                    : 1000000); // Default bitrate for other connection speeds

            var debugBitrateString = (debugBitrate / 1000000) + "M";
            var debugFormat = "webm";
            var debugCrf = (int)userData?.deviceProcessingPower >= 32
                ? userData?.connectionSpeed == "4g" ? "10" : userData?.connectionSpeed == "3g" ? "15" : "20" // Higher processing power, adjusted CRF based on connection speed
                : (userData?.deviceProcessingPower >= 16
                    ? userData?.connectionSpeed == "4g" ? "20" : userData?.connectionSpeed == "3g" ? "25" : "30" // Medium processing power, adjusted CRF based on connection speed
                    : userData?.connectionSpeed == "4g" ? "30" : userData?.connectionSpeed == "3g" ? "35" : "40"); // Lower processing power, adjusted CRF based on connection speed


            try
            {
                // Fetch blob URL and SAS URL from the database based on video ID
                (string blobUrl, string sasUrl) = GetBlobAndSasUrlsFromDatabase(videoId);
                //get duration from db
                 
                // FFmpeg command to transcode video
                string ffmpegArgs = $"-i {blobUrl + "?" + sasUrl} " +
                    $"-ss {startTimestamp} " +
                    $"-t {debugDuration} " +
                    $"-vf scale={debugResolution} " +
                    $"-c:v {debugVideoCodec} " +
                    $"-crf {debugCrf} " +
                    $"-b:v {debugBitrateString} " +
                    $"-c:a {debugAudioCodec} " +
                    $"-f {debugFormat} -";


                var response = new List<FileContentResult>();
                // Start FFmpeg process
                using (var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName =Environment.GetEnvironmentVariable("ffLocation") + "ffmpeg\\ffmpeg.exe",
                        Arguments = ffmpegArgs,
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                })
                {
                    process.Start();

                    int index = 0;
                    // Read the transcoded video from the standard output of FFmpeg
                    using (var memoryStream = new MemoryStream())
                    {
                        await process.StandardOutput.BaseStream.CopyToAsync(memoryStream);

                        // Reset memory stream position to the beginning
                        memoryStream.Position = 0;
                        byte[] fileBytes = memoryStream.ToArray();

                        // Create FileContentResult for each transcoded video
                        log.LogCritical($"Transcoding duration: {process.StartTime - process.ExitTime}");
                        log.LogCritical($"FFmpeg command: {ffmpegArgs}");

                        //return new FileContentResult(fileBytes, "video/webm");
                        //for (int i = 0; i < 5; i++)
                        //{
                        //    response.Add(new FileContentResult(fileBytes, "video/webm"));
                        //}

                        var transcodedVideoResponse = new TranscodedVideoResponse
                        {
                            VideoContentBase64 = Convert.ToBase64String(fileBytes),
                            EndTimestamp = TimeSpan.Parse(startTimestamp) + new TimeSpan(0,0,debugDuration), // Set end timestamp
                            Duration = new TimeSpan(0,0,10), // Calculate duration
                            uniqueID = chunkId
                        };

                        // Serialize the transcoded video response to JSON
                        string jsonResponse = JsonSerializer.Serialize(transcodedVideoResponse);

                        // Return the JSON response
                        return new ContentResult
                        {
                            Content = jsonResponse,
                            ContentType = "application/json",
                            StatusCode = 200
                        };
                    }
                }

                // Return the list of transcoded videos
                return new OkObjectResult(response);
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Error transcoding video: {ex.Message}");
            }
        }

        private static (string, string) GetBlobAndSasUrlsFromDatabase(string videoId)
        {
            string connectionString = Environment.GetEnvironmentVariable("SqlConnectionString"); // Replace with your connection string
            string blobUrl = "";
            string sasUrl = "";

            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();

                using (SqlCommand command = connection.CreateCommand())
                {
                    command.CommandText = "SELECT blobUrl, sasUrl FROM DPVideoMetaData WHERE id = @VideoId";
                    command.Parameters.AddWithValue("@VideoId", videoId);

                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            blobUrl = reader["blobUrl"].ToString();
                            sasUrl = reader["sasUrl"].ToString();
                        }
                    }
                }
            }

            return (blobUrl, sasUrl);
        }
        public class TranscodedVideoResponse
        {
            public string VideoContentBase64 { get; set; }
            public TimeSpan EndTimestamp { get; set; }
            public TimeSpan Duration { get; set; }
            public string uniqueID { get; set; }
        }
        public class VideoMetadata
        {
            public int ResolutionX { get; set; }
            public int ResolutionY { get; set; }
            public int Bitrate { get; set; }
            public long Size { get; set; }
            public string Format { get; set; }
            public decimal Duration { get; set; }
        }
        private static VideoMetadata FetchVideoMetadata(string videoId)
        {
            VideoMetadata videoMetadata = new VideoMetadata();
            string connectionString = Environment.GetEnvironmentVariable("SqlConnectionString"); // Replace with your connection string

            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();
                using (SqlCommand command = connection.CreateCommand())
                {
                    command.CommandText = @"SELECT [format], [resolutionX], [resolutionY], [bitrate], [size], [duration] FROM [dbo].[DPVideoMetaData]  WHERE id = @VideoId";
                    command.Parameters.AddWithValue("@VideoId", videoId);

                    SqlDataReader reader = command.ExecuteReader();
                    while (reader.Read())
                    {

                        videoMetadata.Format = (string)reader["format"];
                        videoMetadata.ResolutionX = (int)reader["resolutionX"];
                        videoMetadata.ResolutionY = (int)reader["resolutionY"];
                        videoMetadata.Bitrate = (int)reader["bitrate"];
                        videoMetadata.Size = (long)reader["size"];
                        videoMetadata.Duration = (decimal)reader["duration"];
                    }
                }
                connection.Close();
            }
            
            return videoMetadata;
        }
    }
}
