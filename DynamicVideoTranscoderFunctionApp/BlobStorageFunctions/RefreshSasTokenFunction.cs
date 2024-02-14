using System;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Host;
using Microsoft.Extensions.Logging;
using Microsoft.WindowsAzure.Storage.Blob;
using Microsoft.WindowsAzure.Storage;
using System.Data.SqlClient;
using static DynamicVideoTranscoderFunctionApp.BlobStorageFunctions.SaveVideoMetadata;
using System.Collections.Generic;

namespace DynamicVideoTranscoderFunctionApp.BlobStorageFunctions
{
    public class RefreshSasTokenFunction
    {
        [FunctionName("RefreshSasTokenFunction")]
        public void Run([TimerTrigger("0 0 0 * * *")]TimerInfo myTimer, ILogger log)
        {
            log.LogInformation($"C# Timer trigger function executed at: {DateTime.Now}");
            try
            {
                string connectionString = Environment.GetEnvironmentVariable("SqlConnectionString");
                string containerName = "videos";

                // Fetch all records from the database
                List<VideoMetadata> videoMetadataList = FetchVideoMetadata(connectionString);

                // Generate SAS tokens and update database for each record
                foreach (var videoMetadata in videoMetadataList)
                {
                    string blobName = videoMetadata.videoName;
                    string format = videoMetadata.format;
                    string sasToken = GenerateSasToken(containerName, blobName, format);

                    // Update SAS token in the database
                    UpdateSasUrl(connectionString, videoMetadata.id, sasToken);
                    log.LogInformation($"SAS token updated for video: {blobName}");
                }

                log.LogInformation("SAS tokens generated and updated successfully.");
            }
            catch (Exception ex)
            {
                log.LogError($"An error occurred: {ex.Message}");
            }
        }
        private static List<VideoMetadata> FetchVideoMetadata(string connectionString)
        {
            List<VideoMetadata> videoMetadataList = new List<VideoMetadata>();

            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();
                using (SqlCommand command = connection.CreateCommand())
                {
                    command.CommandText = @"SELECT [id], [videoName], [format] FROM [dbo].[DPVideoMetaData]";
                    SqlDataReader reader = command.ExecuteReader();
                    while (reader.Read())
                    {
                        VideoMetadata videoMetadata = new VideoMetadata();
                        videoMetadata.id = (Guid)reader["id"];
                        videoMetadata.videoName = (string)reader["videoName"];
                        videoMetadata.format = (string)reader["format"];
                        videoMetadataList.Add(videoMetadata);
                    }
                }
            }

            return videoMetadataList;
        }

        private static string GenerateSasToken(string containerName, string blobName, string format)
        {
            string connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            CloudStorageAccount storageAccount = CloudStorageAccount.Parse(connectionString);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference(containerName);
            CloudBlockBlob blob = container.GetBlockBlobReference($"{blobName}.{format}");

            SharedAccessBlobPolicy sasPolicy = new SharedAccessBlobPolicy()
            {
                Permissions = SharedAccessBlobPermissions.Read,
                SharedAccessStartTime = DateTime.UtcNow.AddMinutes(-15), // Access start time (15 minutes ago to ensure token is valid)
                SharedAccessExpiryTime = DateTime.UtcNow.AddDays(1) // Access expiry time (adjust as needed)
            };

            string sasToken = blob.GetSharedAccessSignature(sasPolicy);
            return sasToken;
        }

        private static void UpdateSasUrl(string connectionString, Guid id, string sasUrl)
        {
            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();
                using (SqlCommand command = connection.CreateCommand())
                {
                    command.CommandText = @"UPDATE [dbo].[DPVideoMetaData] SET [sasurl] = @SasUrl WHERE [id] = @Id";
                    command.Parameters.AddWithValue("@SasUrl", sasUrl);
                    command.Parameters.AddWithValue("@Id", id);
                    command.ExecuteNonQuery();
                }
            }
        }

        private class VideoMetadata
        {
            public Guid id { get; set; }
            public string videoName { get; set; }

            public string format { get; set; }
        }
    }
}
