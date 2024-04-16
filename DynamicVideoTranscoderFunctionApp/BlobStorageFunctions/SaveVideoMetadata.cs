using Azure.Storage.Queues;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json.Linq;
using System;
using System.Data.SqlClient;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;


namespace DynamicVideoTranscoderFunctionApp.BlobStorageFunctions
{
    public class SaveVideoMetadata
    {
        private readonly IConfiguration _config;

        public SaveVideoMetadata(IConfiguration config)
        {
            _config = config;
        }

        [FunctionName("SaveVideoMetadata")]
        public void Run([BlobTrigger("videos/{name}", Connection = "AzureWebJobsStorage")]Stream myBlob, string name, ILogger log)
        {
            var id = Guid.NewGuid();
            var videoname = GetVideoname(name);
            string sasurl = GenerateSasToken("videos",name);
            string bloburl = $"https://dynamicvideotranscoding.blob.core.windows.net/videos/{name}";
            
            var metadata = AnalyzeVideoMetadata(bloburl, sasurl);
            var resolutionX = metadata.VideoStream.Width;
            var resolutionY =metadata.VideoStream.Height;
            var bitrate = metadata.Format.BitRate;
            var duration = metadata.Format.Duration;
            var size = myBlob.Length;
            
            var format = GetFormatFromName(name);


            // save the metadata to a database
            InsertMetadataIntoDatabase(id,videoname, bloburl, sasurl, resolutionX, resolutionY, bitrate, size, format, duration);


            log.LogInformation($"C# Blob trigger function Processed blob\n Name:{name} \n Size: {myBlob.Length} Bytes");
        }
        private string GenerateSasToken(string containerName, string blobName)
        {
            string connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            CloudStorageAccount storageAccount = CloudStorageAccount.Parse(connectionString);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference(containerName);
            CloudBlockBlob blob = container.GetBlockBlobReference(blobName);

            SharedAccessBlobPolicy sasPolicy = new SharedAccessBlobPolicy()
            {
                Permissions = SharedAccessBlobPermissions.Read,
                SharedAccessStartTime = DateTime.UtcNow.AddMinutes(-15), // Access start time (15 minutes ago to ensure token is valid)
                SharedAccessExpiryTime = DateTime.UtcNow.AddDays(1) // Access expiry time (adjust as needed)
            };

            string sasToken = blob.GetSharedAccessSignature(sasPolicy);
            return sasToken;
        }
        private string GetFormatFromName(string blobName)
        {
            // Assuming the format is the file extension at the end of the blob name
            int dotIndex = blobName.LastIndexOf('.');
            if (dotIndex != -1 && dotIndex < blobName.Length - 1)
            {
                return blobName.Substring(dotIndex + 1);
            }
            return ""; // Return empty string if format not found or blob name ends with dot
        }
        private string GetVideoname(string name)
        {
            int dotIndex = name.LastIndexOf('.');
            if (dotIndex != -1 && dotIndex < name.Length - 1)
            {
                return name.Substring(0, dotIndex);
            }
            return ""; // Return empty string if format not found or blob name ends with dot
        }
        private VideoMetaData AnalyzeVideoMetadata(string url, string sasToken)
        {
            string ffmpegArgs = $"-v quiet -print_format json -show_format -show_streams {url+sasToken}";

            using (var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = Environment.GetEnvironmentVariable("ffLocation") + "ffprobe\\ffprobe.exe",
                    Arguments = ffmpegArgs,
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            })
            {
                process.Start();
                string output = process.StandardOutput.ReadToEnd();
                process.WaitForExit();
                // Parse JSON output using JObject
                JObject jsonOutput = JObject.Parse(output);

                // Extract video stream info
                var videoStream = jsonOutput["streams"].FirstOrDefault(s => s["codec_type"].ToString() == "video");
                VideoStreamInfo VideoStream = videoStream != null ? new VideoStreamInfo
                {
                    CodecName = videoStream["codec_name"].ToString(),
                    CodecLongName = videoStream["codec_long_name"].ToString(),
                    Profile = videoStream["profile"].ToString(),
                    CodecType = videoStream["codec_type"].ToString(),
                    Width = Convert.ToInt32(videoStream["width"]),
                    Height = Convert.ToInt32(videoStream["height"]),
                    Duration = Convert.ToDouble(videoStream["duration"]),
                    BitRate = Convert.ToInt32(videoStream["bit_rate"])
                } : null;

                // Extract audio stream info
                var audioStream = jsonOutput["streams"].FirstOrDefault(s => s["codec_type"].ToString() == "audio");
                AudioStreamInfo AudioStream = audioStream != null ? new AudioStreamInfo
                {
                    CodecName = audioStream["codec_name"].ToString(),
                    CodecLongName = audioStream["codec_long_name"].ToString(),
                    Profile = audioStream["profile"].ToString(),
                    CodecType = audioStream["codec_type"].ToString(),
                    SampleRate = Convert.ToInt32(audioStream["sample_rate"]),
                    Channels = Convert.ToInt32(audioStream["channels"]),
                    Duration = Convert.ToDouble(audioStream["duration"]),
                    BitRate = Convert.ToInt32(audioStream["bit_rate"])
                } : null;

                // Extract format info
                FormatInfo Format = new FormatInfo
                {
                    Filename = jsonOutput["format"]["filename"].ToString(),
                    NbStreams = Convert.ToInt32(jsonOutput["format"]["nb_streams"]),
                    FormatName = jsonOutput["format"]["format_name"].ToString(),
                    FormatLongName = jsonOutput["format"]["format_long_name"].ToString(),
                    Duration = Convert.ToDouble(jsonOutput["format"]["duration"]),
                    Size = Convert.ToInt32(jsonOutput["format"]["size"]),
                    BitRate = Convert.ToInt32(jsonOutput["format"]["bit_rate"])
                };

                return new VideoMetaData
                {
                    VideoStream = VideoStream,
                    AudioStream = AudioStream,
                    Format = Format
                };
            }


        }
        private void InsertMetadataIntoDatabase(Guid id,string name, string bloburl, string sasurl, int resolutionX, int resolutionY, int bitrate, long size, string format, double duration)
        {
            string connectionString = Environment.GetEnvironmentVariable("SqlConnectionString"); // You should replace "YourConnectionString" with your actual connection string key in appsettings.json
            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();
                using (SqlCommand command = connection.CreateCommand())
                {
                    command.CommandText = @"INSERT INTO [dbo].[DPVideoMetaData] ([id], [videoName],[bloburl], [sasurl], [resolutionX], [resolutionY], [bitrate], [size], [format], [duration]) 
                                       VALUES (@Id,@videoName, @BlobUrl, @SasUrl, @ResolutionX, @ResolutionY, @Bitrate, @Size, @Format, @Duration)";
                    command.Parameters.AddWithValue("@Id", id);
                    command.Parameters.AddWithValue("@videoName", name);
                    command.Parameters.AddWithValue("@BlobUrl", bloburl);
                    command.Parameters.AddWithValue("@SasUrl", sasurl);
                    command.Parameters.AddWithValue("@ResolutionX", resolutionX);
                    command.Parameters.AddWithValue("@ResolutionY", resolutionY);
                    command.Parameters.AddWithValue("@Bitrate", bitrate);
                    command.Parameters.AddWithValue("@Size", size);
                    command.Parameters.AddWithValue("@Format", format);
                    command.Parameters.AddWithValue("@Duration", duration);
                    command.ExecuteNonQuery();
                }
            }
        }
        // This method would typically analyze the video file at the given URL and return its metadata
        // For the purpose of this demo, we'll just return some dummy metadata

        public class VideoStreamInfo
        {
            public string CodecName { get; set; }
            public string CodecLongName { get; set; }
            public string Profile { get; set; }
            public string CodecType { get; set; }
            public int Width { get; set; }
            public int Height { get; set; }
            public double Duration { get; set; }
            public int BitRate { get; set; }
        }

        public class AudioStreamInfo
        {
            public string CodecName { get; set; }
            public string CodecLongName { get; set; }
            public string Profile { get; set; }
            public string CodecType { get; set; }
            public int SampleRate { get; set; }
            public int Channels { get; set; }
            public double Duration { get; set; }
            public int BitRate { get; set; }
        }

        public class FormatInfo
        {
            public string Filename { get; set; }
            public int NbStreams { get; set; }
            public string FormatName { get; set; }
            public string FormatLongName { get; set; }
            public double Duration { get; set; }
            public int Size { get; set; }
            public int BitRate { get; set; }
        }

        public class VideoMetaData
        {
            public VideoStreamInfo VideoStream { get; set; }
            public AudioStreamInfo AudioStream { get; set; }
            public FormatInfo Format { get; set; }
        }

    }
    }

