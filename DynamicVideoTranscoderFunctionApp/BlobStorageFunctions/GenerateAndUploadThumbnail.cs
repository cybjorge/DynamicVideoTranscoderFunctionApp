using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection.Metadata;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Sql;
using Microsoft.Extensions.Logging;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json;
using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;


namespace DynamicVideoTranscoderFunctionApp.BlobStorageFunctions
{

    public static class SqlTriggerBinding
    {
        private static readonly string _blobConnectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
        private static readonly string _thumbnailsContainerName = "thumbnails";


        [FunctionName("GenerateAndUploadThumbnail")]
        public static async Task Run(
                [SqlTrigger("[dbo].[DPVideoMetaData]", "SqlConnectionString")] IReadOnlyList<SqlChange<ToDoItem>> changes,
                ILogger log)
        {

            foreach (var change in changes.Where(x=>x.Operation == SqlChangeOperation.Insert))
            {
                var test  = change.Item;
                try
                {
                    var ffmpegArgs = $"-i {change.Item.bloburl+"?"+change.Item.sasurl} -vf thumbnail=n=100 -frames:v 1 -f image2pipe -";

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
                        var thumbnailStream = new MemoryStream();
                        await process.StandardOutput.BaseStream.CopyToAsync(thumbnailStream);

                        // Read the output of FFmpeg process and write it to the memory stream
                        var thumbnailUrl = await UploadThumbnailToBlobStorageAsync(thumbnailStream.ToArray(), change.Item.videoName);
                        // Convert memory stream to byte array
                        change.Item.thumbnailurl = thumbnailUrl; // Assuming you have a property 'thumbnailurl' in your ToDoItem
                        InsertThumbnailUrlIntoDatabase(new Guid(change.Item.Id), thumbnailUrl);

                    }
                }
                catch (Exception ex)
                {
                    log.LogError($"Error: {ex.Message}");
                }
                log.LogInformation("SQL Changes: " + JsonConvert.SerializeObject(changes));
            }
           

        }
        private static async Task<string> UploadThumbnailToBlobStorageAsync(byte[] thumbnailBytes, string videoName)
        {


            var storageAccount = CloudStorageAccount.Parse(_blobConnectionString);
            var blobClient = storageAccount.CreateCloudBlobClient();
            var container = blobClient.GetContainerReference(_thumbnailsContainerName);
            await container.CreateIfNotExistsAsync();

            string thumbnailFileName = $"{videoName}_thumbnail.png";
            var thumbnailBlob = container.GetBlockBlobReference(thumbnailFileName);
            await thumbnailBlob.UploadFromByteArrayAsync(thumbnailBytes, 0, thumbnailBytes.Length);

            return thumbnailBlob.Uri.ToString();
        }
        private static void InsertThumbnailUrlIntoDatabase(Guid id, string thumbnailUrl)
        {
            string connectionString = Environment.GetEnvironmentVariable("SqlConnectionString"); // You should replace "YourConnectionString" with your actual connection string key in appsettings.json
            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();
                using (SqlCommand command = connection.CreateCommand())
                {
                    // Use UPDATE statement to modify an existing row
                    command.CommandText = @"UPDATE [dbo].[DPVideoMetaData] SET [thumbnailurl] = @thumbnailurl WHERE id = @id";
                    command.Parameters.AddWithValue("@thumbnailurl", thumbnailUrl);
                    command.Parameters.AddWithValue("@id", id);

                    command.ExecuteNonQuery();
                }
            }
        }
    }

    public class ToDoItem
    {
        public string Id { get; set; }
        public string videoName { get; set; }
        public string bloburl { get; set; }
        public string sasurl { get; set; }
        public string thumbnailurl { get; set; }
        public int Priority { get; set; }
        public string Description { get; set; }
    }
}
